import app from './app.js';
import { initDb } from './db.js';

const PORT = process.env.PORT || 3001;

async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`[user-service] http://localhost:${PORT}`));
}

start();
