import express from 'express';
import rateLimit from 'express-rate-limit';
import eventRoutes from './routes/events.js';

const app = express();

app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});

app.use(limiter);

app.use('/events', eventRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Event Service v1.0" });
});

export default app;
