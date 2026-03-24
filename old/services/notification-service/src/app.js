import express from 'express';
import notifRoutes from './routes/notifications.routes.js';

const app = express();
app.use(express.json());
app.use('/notifications', notifRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

export default app;
