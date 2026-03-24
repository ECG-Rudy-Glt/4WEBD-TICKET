import express from 'express';
import accountRoutes from './routes/accounts.js';
import rateLimit from "express-rate-limit";

const app = express();

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});

app.use(limiter);

app.use(express.json());

app.use('/accounts', accountRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Account Service v1.0 "});
});

export default app;