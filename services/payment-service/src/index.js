import app from './app.js';
import { initDb } from './db.js';
import { startConsumer } from './services/queue.consumer.js';

const PORT = process.env.PORT || 3005;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[payment-service] Démarré sur http://localhost:${PORT}`);
  });
  startConsumer();
}

start();
