import { Router } from 'express';
import * as ticketService from '../services/ticket.service.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const start = (page - 1) * limit;
        const all   = await ticketService.getAllTickets();
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
        res.json(await ticketService.getTicketsByUser(parseInt(req.params.userId)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/event/:eventId', async (req, res) => {
    try {
        res.json(await ticketService.getTicketsByEvent(parseInt(req.params.eventId)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        res.json(await ticketService.getTicketById(parseInt(req.params.id)));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const ticket = await ticketService.updateTicketStatus(
            parseInt(req.params.id), req.body.status, req.body.paymentId
        );
        res.json(ticket);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
