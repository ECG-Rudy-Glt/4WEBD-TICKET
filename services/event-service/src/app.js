import express from 'express';
import eventsRoutes from './routes/events.routes.js';

const app = express();
app.use(express.json());
app.use('/events', eventsRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'event-service' }));

export default app;
