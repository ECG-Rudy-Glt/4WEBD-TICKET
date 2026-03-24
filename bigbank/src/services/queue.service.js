import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest@localhost:5672';
const QUEUE_NAME = 'transactions';

let channel = null;
let connection = null;

export async function connectQueue () {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`Connecte a RabbitMQ, queue "${QUEUE_NAME}", prete`);
    } catch (err) {
        console.error('Erreur connexion RabbitMQ:', err.message);
        setTimeout(connectQueue, 5000);
    }
}

export function publishTransaction(data) {
    if (!channel) {
        throw new Error('RabbitMQ non connecté');
    }
    channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(data)),
        { persistent: true }
    );
    console.log(`Transaction publiee dans la queue: ${JSON.stringify(data)}`);
}