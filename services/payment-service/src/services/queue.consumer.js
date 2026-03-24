import axios from 'axios';
import { processPayment } from './payment.service.js';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
const EVENT_SERVICE   = process.env.EVENT_SERVICE_URL   || 'http://event-service:3003';

export async function startConsumer(channel) {
  await channel.assertQueue('payments', { durable: true });
  await channel.assertQueue('notifications', { durable: true });
  channel.prefetch(1);

  console.log('[payment-service] En attente de messages sur "payments"...');

  channel.consume('payments', async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());

    try {
      const payment = await processPayment(data);

      if (payment.status === 'success') {
        await axios.patch(`${BOOKING_SERVICE}/tickets/${data.ticketId}/status`, {
          status: 'confirmed', paymentId: payment.id,
        });
        channel.sendToQueue('notifications', Buffer.from(JSON.stringify({
          type:           'payment_success',
          userId:         data.userId,
          userEmail:      data.userEmail,
          eventTitle:     data.eventTitle,
          quantity:       data.quantity,
          amountInCents:  payment.amountInCents,
          transactionRef: payment.transactionRef,
          ticketCode:     data.ticketCode,
        })), { persistent: true });
      } else {
        await axios.patch(`${BOOKING_SERVICE}/tickets/${data.ticketId}/status`, { status: 'cancelled' });
        await axios.patch(`${EVENT_SERVICE}/events/${data.eventId}/capacity/restore`, { quantity: data.quantity });
        channel.sendToQueue('notifications', Buffer.from(JSON.stringify({
          type:          'payment_failed',
          userId:        data.userId,
          userEmail:     data.userEmail,
          eventTitle:    data.eventTitle,
          amountInCents: payment.amountInCents,
          reason:        'Paiement refusé par la banque',
        })), { persistent: true });
      }

      channel.ack(msg);
    } catch (err) {
      console.error('[payment-service] Erreur:', err.message);
      channel.ack(msg);
    }
  });
}
