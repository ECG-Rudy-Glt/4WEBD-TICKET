import amqp from 'amqplib';
import { sendNotification } from './notification.service.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const NOTIF_QUEUE  = 'notifications';

export async function startConsumer() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch   = await conn.createChannel();
    await ch.assertQueue(NOTIF_QUEUE, { durable: true });
    ch.prefetch(1);

    console.log(`[notification-service] En attente de messages sur "${NOTIF_QUEUE}"...`);

    ch.consume(NOTIF_QUEUE, async (msg) => {
      if (!msg) return;

      const data = JSON.parse(msg.content.toString());
      console.log(`[notification-service] Notification reçue — type:${data.type} user:${data.userId}`);

      try {
        await sendNotification(data);
        ch.ack(msg);
        console.log(`[notification-service] Notification envoyée et acquittée`);
      } catch (err) {
        // Les notifications sont best-effort : on ack même en cas d'erreur
        console.error('[notification-service] Erreur envoi notification:', err.message);
        ch.ack(msg);
      }
    });
  } catch (err) {
    console.error('[notification-service] Erreur connexion RabbitMQ:', err.message);
    setTimeout(startConsumer, 5000);
  }
}
