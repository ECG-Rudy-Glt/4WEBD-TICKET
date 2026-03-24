import amqp from 'amqplib';
import { sendNotification } from './notification.service.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

export async function startConsumer() {
  try {
    const conn    = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue('notifications', { durable: true });
    channel.prefetch(1);
    console.log('[notification-service] En attente sur "notifications"...');

    channel.consume('notifications', async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      try {
        await sendNotification(data);
      } catch (err) {
        console.error('[notification-service] Erreur:', err.message);
      }
      channel.ack(msg);
    });
  } catch (err) {
    console.error('[notification-service] Connexion RabbitMQ échouée:', err.message);
    setTimeout(startConsumer, 5000);
  }
}
