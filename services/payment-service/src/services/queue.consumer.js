import amqp from 'amqplib';
import { processPayment } from './payment.service.js';

const RABBITMQ_URL  = process.env.RABBITMQ_URL  || 'amqp://guest:guest@rabbitmq:5672';
const BOOKING_URL   = process.env.BOOKING_URL   || 'http://booking-lb:3020';
const EVENT_URL     = process.env.EVENT_URL     || 'http://event-lb:3021';
const PAYMENT_QUEUE = 'payments';
const NOTIF_QUEUE   = 'notifications';

let notifChannel = null;

async function connectNotifQueue() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    notifChannel = await conn.createChannel();
    await notifChannel.assertQueue(NOTIF_QUEUE, { durable: true });
    console.log('[payment-service] Queue notifications prête');
  } catch (err) {
    console.error('[payment-service] Erreur connexion queue notifications:', err.message);
    setTimeout(connectNotifQueue, 5000);
  }
}

async function publishNotif(data) {
  if (!notifChannel) {
    console.error('[payment-service] Queue notifications non disponible');
    return;
  }
  notifChannel.sendToQueue(NOTIF_QUEUE, Buffer.from(JSON.stringify(data)), { persistent: true });
}

async function handlePayment(msg, ch) {
  const data = JSON.parse(msg.content.toString());
  const { ticketId, ticketCode, eventId, eventTitle, userId, userEmail, amountInCents, quantity, cardToken } = data;

  console.log(`[payment-service] Traitement paiement — ticket:${ticketId} montant:${amountInCents}cts`);

  try {
    const { payment, success } = await processPayment({
      ticketId, userId, eventId, amountInCents, cardToken,
    });

    if (success) {
      // Confirmer le ticket
      await fetch(`${BOOKING_URL}/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', paymentId: payment.id }),
      });

      await publishNotif({
        type:          'payment_success',
        userId,
        userEmail,
        ticketId,
        ticketCode,
        eventId,
        eventTitle,
        amountInCents,
        quantity,
        transactionRef: payment.transactionRef,
        cardLast4:      payment.cardLast4,
      });

      console.log(`[payment-service] Paiement OK — ref:${payment.transactionRef}`);
    } else {
      // Annuler le ticket
      await fetch(`${BOOKING_URL}/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      // Restaurer la capacité de l'événement
      await fetch(`${EVENT_URL}/events/${eventId}/capacity/restore`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      await publishNotif({
        type:       'payment_failed',
        userId,
        userEmail,
        ticketId,
        eventId,
        eventTitle,
        amountInCents,
        reason:     'Paiement refusé par la banque',
      });

      console.log(`[payment-service] Paiement ÉCHOUÉ — ticket:${ticketId} annulé, capacité restaurée`);
    }

    ch.ack(msg);
  } catch (err) {
    console.error('[payment-service] Erreur traitement paiement:', err.message);
    ch.nack(msg, false, true);
  }
}

export async function startConsumer() {
  try {
    await connectNotifQueue();

    const conn = await amqp.connect(RABBITMQ_URL);
    const ch   = await conn.createChannel();
    await ch.assertQueue(PAYMENT_QUEUE, { durable: true });
    ch.prefetch(1);

    console.log(`[payment-service] En attente de messages sur "${PAYMENT_QUEUE}"...`);

    ch.consume(PAYMENT_QUEUE, (msg) => {
      if (msg) handlePayment(msg, ch);
    });
  } catch (err) {
    console.error('[payment-service] Erreur connexion RabbitMQ:', err.message);
    setTimeout(startConsumer, 5000);
  }
}
