import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});

app.use(limiter);

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Auth Service v1.0" });
});

export default app;
