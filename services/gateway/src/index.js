import app from './app.js';
import { initRabbitMQ } from './rabbitmq.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await initRabbitMQ();
  app.listen(PORT, () => console.log(`[api-gateway] http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('[api-gateway] Erreur démarrage:', err.message);
  setTimeout(() => start(), 5000);
});
