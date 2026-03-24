import express from 'express';
import paymentsRoutes from './routes/payments.routes.js';

const app = express();
app.use(express.json());
app.use('/payments', paymentsRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payment-service' }));

export default app;
