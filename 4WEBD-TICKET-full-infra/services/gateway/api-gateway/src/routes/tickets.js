import { Router } from 'express';
import * as bookingService from '../services/booking.service.js';

const router = Router();

router.get('/user/:userId', async (req, res) => {
    try {
        const tickets = await bookingService.getTicketsByUser(req.params.userId);
        res.json(tickets);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/event/:eventId', async (req, res) => {
    try {
        const tickets = await bookingService.getTicketsByEvent(req.params.eventId);
        res.json(tickets);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const ticket = await bookingService.getTicketById(req.params.id);
        res.json(ticket);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
