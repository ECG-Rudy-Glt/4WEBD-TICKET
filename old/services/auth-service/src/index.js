import app from './app.js';
import { initDb } from './db.js';

const PORT = process.env.PORT || 3004;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[auth-service] Démarré sur http://localhost:${PORT}`);
  });
}

start();
