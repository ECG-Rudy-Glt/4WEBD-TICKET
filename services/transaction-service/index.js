import app from './src/app.js';
import { connectRabbitMQ } from './src/rabbitmq.js';

const PORT = process.env.PORT || 3005;

await connectRabbitMQ();

app.listen(PORT, () => {
    console.log(`Transaction Service démarré sur http://localhost:${PORT}`);
});