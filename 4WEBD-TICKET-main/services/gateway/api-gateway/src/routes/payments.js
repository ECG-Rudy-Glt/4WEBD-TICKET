import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as paymentService from '../services/payment.service.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await paymentService.getAllPayments(page, limit);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await paymentService.getPaymentsByUser(req.params.userId, page, limit);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const data = await paymentService.getPaymentById(req.params.id);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
