import app from './app.js';
import { initDb } from './db.js';
import { startConsumer } from './services/queue.consumer.js';
import amqp from 'amqplib';

const PORT         = process.env.PORT || 3005;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

async function start() {
  await initDb();
  const conn    = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();
  await startConsumer(channel);
  app.listen(PORT, () => console.log(`[payment-service] http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('[payment-service] Erreur démarrage:', err.message);
  setTimeout(() => start(), 5000);
});
