import express from 'express';
import rateLimit from 'express-rate-limit';
import ticketRoutes from './routes/tickets.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});

app.use(limiter);

app.use('/tickets', ticketRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Booking Service v1.0" });
});

export default app;
