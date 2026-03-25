import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME   = 'bookings';

let channel    = null;
let connection = null;

export async function connectQueue() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel    = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`Connecté à RabbitMQ, queue "${QUEUE_NAME}" prête`);
    } catch (err) {
        console.error('Erreur connexion RabbitMQ:', err.message);
        setTimeout(connectQueue, 5000);
    }
}

export function publishBooking(data) {
    if (!channel) {
        throw new Error('RabbitMQ non connecté');
    }
    channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(data)),
        { persistent: true }
    );
    console.log(`Réservation publiée dans la queue: ${JSON.stringify(data)}`);
}
