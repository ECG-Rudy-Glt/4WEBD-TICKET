import { Router } from 'express';
import * as notifService from '../services/notification.service.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        res.json(await notifService.getAllNotifications());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        res.json(await notifService.getNotificationsByUser(parseInt(req.params.userId)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
