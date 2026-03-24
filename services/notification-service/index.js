import app from './src/app.js';
import { startConsumer } from './src/consumer.js';

const PORT = process.env.PORT || 3002;

await startConsumer();

app.listen(PORT, () => {
    console.log(`Notification Service démarré sur http://localhost:${PORT}`);
});