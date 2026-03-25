import app from './src/app.js';
import { initDb } from './src/db.js';
import { startConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Payment Service démarré sur http://localhost:${PORT}`);
    });
    startConsumer();
}

start();
