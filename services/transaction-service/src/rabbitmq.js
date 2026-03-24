import amqp from 'amqplib';

const EXCHANGE = 'transactions';
let channel = null;

export async function connectRabbitMQ() {
    const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@rabbitmq:5672';
    const conn = await amqp.connect(url);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('[RabbitMQ] Connecté, exchange "transactions" prêt');
}

export async function publish(routingKey, payload) {
    if (!channel) throw new Error('RabbitMQ non initialisé');
    channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
    );
}
