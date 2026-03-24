import amqp from 'amqplib';
import { createTicket } from './ticket.service.js';
import { acquireLock, releaseLock } from '../redis.js';

const RABBITMQ_URL   = process.env.RABBITMQ_URL   || 'amqp://guest:guest@rabbitmq:5672';
const EVENT_URL      = process.env.EVENT_URL       || 'http://event-lb:3021';
const PAYMENT_QUEUE  = 'payments';
const BOOKING_QUEUE  = 'bookings';
const NOTIF_QUEUE    = 'notifications';

let channel = null;

async function connectNotifAndPayment() {
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(PAYMENT_QUEUE, { durable: true });
  await channel.assertQueue(NOTIF_QUEUE,   { durable: true });
}

async function publishToQueue(queue, data) {
  if (!channel) throw new Error('Channel RabbitMQ non initialisé');
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
}

async function processBooking(msg, ch) {
  const data = JSON.parse(msg.content.toString());
  const { eventId, userId, userEmail, quantity, cardToken } = data;

  console.log(`[booking-service] Traitement réservation — event:${eventId} user:${userId} qty:${quantity}`);

  const lockKey = `event:lock:${eventId}`;
  const lockId  = await acquireLock(lockKey, 5000);

  if (!lockId) {
    console.warn(`[booking-service] Lock non acquis pour event:${eventId} — requeue`);
    return ch.nack(msg, false, true);
  }

  try {
    // Vérification capacité sur le primary (fraîche)
    const res = await fetch(`${EVENT_URL}/events/${eventId}`);
    if (!res.ok) {
      await publishToQueue(NOTIF_QUEUE, {
        type: 'booking_failed', userId, userEmail,
        reason: 'Événement introuvable ou indisponible',
      });
      return ch.ack(msg);
    }

    const event = await res.json();

    if (event.status !== 'active') {
      await publishToQueue(NOTIF_QUEUE, {
        type: 'booking_failed', userId, userEmail,
        eventTitle: event.title,
        reason: event.status === 'sold_out' ? 'Événement complet' : 'Événement annulé',
      });
      return ch.ack(msg);
    }

    if (event.availableTickets < quantity) {
      await publishToQueue(NOTIF_QUEUE, {
        type: 'booking_failed', userId, userEmail,
        eventTitle: event.title,
        reason: `Plus assez de places (disponibles: ${event.availableTickets})`,
      });
      return ch.ack(msg);
    }

    // Décrémenter la capacité (atomique en DB)
    const decrRes = await fetch(`${EVENT_URL}/events/${eventId}/capacity/decrement`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });

    if (!decrRes.ok) {
      await publishToQueue(NOTIF_QUEUE, {
        type: 'booking_failed', userId, userEmail,
        eventTitle: event.title,
        reason: 'Plus de places disponibles',
      });
      return ch.ack(msg);
    }

    // Créer le ticket en DB
    const ticket = await createTicket({
      eventId, userId,
      priceInCents: event.priceInCents * quantity,
      quantity,
    });

    console.log(`[booking-service] Ticket créé — id:${ticket.id} code:${ticket.ticketCode}`);

    // Publier vers la queue payments
    await publishToQueue(PAYMENT_QUEUE, {
      ticketId:     ticket.id,
      ticketCode:   ticket.ticketCode,
      eventId,
      eventTitle:   event.title,
      userId,
      userEmail,
      amountInCents: event.priceInCents * quantity,
      quantity,
      cardToken,
    });

    ch.ack(msg);
  } catch (err) {
    console.error('[booking-service] Erreur traitement réservation:', err.message);
    ch.nack(msg, false, true);
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

export async function startConsumer() {
  try {
    await connectNotifAndPayment();

    const conn = await amqp.connect(RABBITMQ_URL);
    const ch   = await conn.createChannel();
    await ch.assertQueue(BOOKING_QUEUE, { durable: true });
    ch.prefetch(1); // 1 message à la fois par instance

    console.log(`[booking-service] En attente de messages sur "${BOOKING_QUEUE}"...`);

    ch.consume(BOOKING_QUEUE, (msg) => {
      if (msg) processBooking(msg, ch);
    });
  } catch (err) {
    console.error('[booking-service] Erreur connexion RabbitMQ:', err.message);
    setTimeout(startConsumer, 5000);
  }
}
