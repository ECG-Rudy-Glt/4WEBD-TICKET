import amqp from 'amqplib';
import { saveAndLog } from './notification.service.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const QUEUE_NAME   = 'notifications';

export async function startNotificationConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel    = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        channel.prefetch(1);

        console.log(`[notification-service] En attente sur la queue "${QUEUE_NAME}"...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
            const data = JSON.parse(msg.content.toString());
            try {
                await saveAndLog(data);
            } catch (err) {
                console.error('[notification-service] Erreur:', err.message);
            }
            channel.ack(msg);
        });
    } catch (err) {
        console.error('[notification-service] Erreur connexion RabbitMQ:', err.message);
        setTimeout(startNotificationConsumer, 5000);
    }
}
