import express from 'express';
import adminRoutes from './routes/admin.js';
import { zipkinMiddleware } from './tracer.js';

const app = express();

app.use(zipkinMiddleware('bigbank-admin'));
app.use(express.json());

app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.json({ message: "BigBank Admin API v1.0" });
});

export default app;