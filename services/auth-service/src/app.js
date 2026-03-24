import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans une minute' },
});
app.use(limiter);

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

export default app;
