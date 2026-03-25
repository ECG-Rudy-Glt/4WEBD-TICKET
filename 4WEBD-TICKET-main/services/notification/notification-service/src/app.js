import express from 'express';
import notificationRoutes from './routes/notifications.js';

const app = express();

app.use(express.json());

app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Notification Service v1.0" });
});

export default app;
