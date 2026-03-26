import { Router } from 'express';
import { createEventSchema, updateEventSchema } from '../schemas/event.schema.js';
import * as eventService from '../services/event.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const data  = createEventSchema.parse(req.body);
        const event = await eventService.createEvent(data);
        res.status(201).json(event);
    } catch (err) {
        if (err.issues) return res.status(400).json({ errors: err.issues });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 10;
        const start  = (page - 1) * limit;
        const all    = await eventService.getAllEvents();
        const paged  = all.slice(start, start + limit);
        res.json({
            data: paged,
            pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        res.json(await eventService.getEventById(parseInt(req.params.id)));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const data  = updateEventSchema.parse(req.body);
        const event = await eventService.updateEvent(parseInt(req.params.id), data);
        res.json(event);
    } catch (err) {
        if (err.issues) return res.status(400).json({ errors: err.issues });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await eventService.deleteEvent(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.patch('/:id/capacity/decrement', async (req, res) => {
    try {
        res.json(await eventService.decrementCapacity(parseInt(req.params.id), req.body.quantity));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.patch('/:id/capacity/restore', async (req, res) => {
    try {
        await eventService.restoreCapacity(parseInt(req.params.id), req.body.quantity);
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
