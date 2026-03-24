import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

let channel;

export async function initRabbitMQ() {
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue('bookings', { durable: true });
  console.log('[api-gateway] RabbitMQ connecté');
}

export function getChannel() {
  return channel;
}
