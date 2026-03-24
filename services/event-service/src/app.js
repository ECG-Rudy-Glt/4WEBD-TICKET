import express from 'express';
import rateLimit from 'express-rate-limit';
import eventsRoutes from './routes/events.routes.js';

const app = express();

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans une minute' },
});
app.use(limiter);

app.use('/events', eventsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'event-service' }));

export default app;
