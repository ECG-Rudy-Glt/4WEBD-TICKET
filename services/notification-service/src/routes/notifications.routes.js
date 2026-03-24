import { Router } from 'express';
import * as notifService from '../services/notification.service.js';

const router = Router();

// GET /notifications — toutes les notifications (admin)
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await notifService.getAllNotifications({ page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /notifications/user/:userId — notifications d'un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await notifService.getNotificationsByUser(
      parseInt(req.params.userId), { page, limit }
    );
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
