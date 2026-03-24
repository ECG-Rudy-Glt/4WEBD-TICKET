import express from 'express';
import notifyRoutes from './routes/notify.js';

const app = express();

app.use(express.json());

app.use('/notify',notifyRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Notification Service v1.0" });
});

export default app;