import app from './src/app.js';
import { startConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Transaction Service démarré sur http://localhost:${PORT}`);
});

startConsumer();