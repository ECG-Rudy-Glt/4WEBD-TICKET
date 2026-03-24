import express from 'express';
import rateLimit from 'express-rate-limit';
import paymentsRoutes from './routes/payments.routes.js';

const app = express();

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans une minute' },
});
app.use(limiter);

app.use('/payments', paymentsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payment-service' }));

export default app;
