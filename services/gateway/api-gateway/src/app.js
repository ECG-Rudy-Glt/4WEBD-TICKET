import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import bookingRoutes from './routes/bookings.js';
import ticketRoutes from './routes/tickets.js';
import { connectQueue } from './services/queue.service.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});

app.use(limiter);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/bookings', bookingRoutes);
app.use('/tickets', ticketRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.json({ message: "TicketApp API Gateway v1.0" });
});

connectQueue();

export default app;
