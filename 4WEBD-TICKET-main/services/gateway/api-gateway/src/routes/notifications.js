import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await notificationService.getAllNotifications(page, limit);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await notificationService.getNotificationsByUser(req.params.userId, page, limit);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
