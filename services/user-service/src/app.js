import express from 'express';
import usersRoutes from './routes/users.routes.js';

const app = express();
app.use(express.json());
app.use('/users', usersRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));

export default app;
