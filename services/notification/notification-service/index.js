import app from './src/app.js';
import { initDb } from './src/db.js';
import { startNotificationConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT || 3000;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Notification Service démarré sur http://localhost:${PORT}`);
    });
    startNotificationConsumer();
}

start();
