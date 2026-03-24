import amqp from 'amqplib';
import axios from 'axios';
import { createTicket } from './ticket.service.js';
import { acquireLock, releaseLock } from '../redis.js';

const RABBITMQ_URL  = process.env.RABBITMQ_URL  || 'amqp://guest:guest@rabbitmq:5672';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://event-service:3003';

export async function startConsumer(channel) {
  await channel.assertQueue('bookings', { durable: true });
  await channel.assertQueue('payments', { durable: true });
  await channel.assertQueue('notifications', { durable: true });
  channel.prefetch(1);

  console.log('[booking-service] En attente de messages sur "bookings"...');

  channel.consume('bookings', async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    const lockKey = `lock:event:${data.eventId}`;
    let lockId;

    try {
      lockId = await acquireLock(lockKey, 10000);
      if (!lockId) throw new Error('Impossible d\'acquérir le verrou');

      // Décrémente les places (atomique, échoue si plus de places)
      await axios.patch(`${EVENT_SERVICE}/events/${data.eventId}/capacity/decrement`, {
        quantity: data.quantity || 1,
      });

      const ticket = await createTicket(data);

      channel.sendToQueue('payments', Buffer.from(JSON.stringify({
        ticketId:     ticket.id,
        userId:       data.userId,
        userEmail:    data.userEmail,
        eventId:      data.eventId,
        eventTitle:   data.eventTitle,
        quantity:     data.quantity || 1,
        priceInCents: ticket.priceInCents,
        cardToken:    data.cardToken,
      })), { persistent: true });

      channel.ack(msg);
    } catch (err) {
      console.error('[booking-service] Erreur:', err.message);
      channel.sendToQueue('notifications', Buffer.from(JSON.stringify({
        type:      'booking_failed',
        userId:    data.userId,
        userEmail: data.userEmail,
        eventTitle: data.eventTitle,
        reason:    err.message,
      })), { persistent: true });
      channel.ack(msg);
    } finally {
      if (lockId) await releaseLock(lockKey, lockId);
    }
  });
}
