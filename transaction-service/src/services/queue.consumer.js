import amqp from 'amqplib';
import { createTransaction } from './transaction.service.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'transactions';

export async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, {durable: true});
        channel.prefetch(1);

        console.log(`En attente de messages sur la queue "${QUEUE_NAME}"... `);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                console.log('Transaction reçue: ', data);
                try {
                    const result = await createTransaction(data);
                    console.log('Transaction traitee avec succès: ', result.id);
                    channel.ack(msg);
                } catch (err) {
                    console.error('Erreur traitement transaction: ', err.message);
                    channel.nack(msg, false, true);
                }
            }
        });
    } catch (err) {
        console.error('Erreur connexion RabbitMQ consumer: ', err.message);
        setTimeout(startConsumer, 5000);
    }
}