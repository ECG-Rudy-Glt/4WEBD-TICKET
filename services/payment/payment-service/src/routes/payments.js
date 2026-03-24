import { Router } from 'express';
import * as paymentService from '../services/payment.service.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const start = (page - 1) * limit;
        const all   = await paymentService.getAllPayments();
        const paged = all.slice(start, start + limit);
        res.json({
            data: paged,
            pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        res.json(await paymentService.getPaymentsByUser(parseInt(req.params.userId)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        res.json(await paymentService.getPaymentById(parseInt(req.params.id)));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
