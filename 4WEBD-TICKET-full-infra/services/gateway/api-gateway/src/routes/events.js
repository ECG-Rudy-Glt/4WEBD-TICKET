import { Router } from 'express';
import { createEventSchema, updateEventSchema } from '../schemas/event.schema.js';
import * as eventService from '../services/event.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const start = (page - 1) * limit;
        const query = new URLSearchParams(req.query).toString();

        const allEvents = await eventService.getAllEvents(query);
        res.json({
            data: allEvents.slice(start, start + limit),
            pagination: { page, limit, total: allEvents.length, totalPages: Math.ceil(allEvents.length / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const event = await eventService.getEventById(parseInt(req.params.id));
        res.json(event);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res) => {
    try {
        const data  = createEventSchema.parse(req.body);
        const event = await eventService.createEvent(data);
        res.status(201).json(event);
    } catch (err) {
        if (err.issues) return res.status(400).json({ errors: err.issues });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.put('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res) => {
    try {
        const data  = updateEventSchema.parse(req.body);
        const event = await eventService.updateEvent(parseInt(req.params.id), data);
        res.json(event);
    } catch (err) {
        if (err.issues) return res.status(400).json({ errors: err.issues });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.delete('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res) => {
    try {
        await eventService.deleteEvent(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
