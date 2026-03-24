import express from 'express';
import ticketsRoutes from './routes/tickets.routes.js';

const app = express();
app.use(express.json());
app.use('/tickets', ticketsRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'booking-service' }));

export default app;
