import express from 'express';
import notifyRoutes from './routes/notify.js';
import { zipkinMiddleware } from './tracer.js';

const app = express();

app.use(zipkinMiddleware('notification-service'));
app.use(express.json());

app.use('/notify',notifyRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Notification Service v1.0" });
});

export default app;