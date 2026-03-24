import express from 'express';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(express.json());

app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.json({ message: "BigBank Admin API v1.0" });
});

export default app;