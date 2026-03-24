import app from './src/app.js';
import { startNotificationConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Notification Service démarré sur http://localhost:${PORT}`);
});

startNotificationConsumer();