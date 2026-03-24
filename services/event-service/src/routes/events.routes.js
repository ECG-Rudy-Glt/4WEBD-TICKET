import { Router } from 'express';
import * as eventService from '../services/event.service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const creatorId = parseInt(req.headers['x-user-id']);
    const event = await eventService.createEvent({ ...req.body, creatorId });
    res.status(201).json(event);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json(await eventService.getAllEvents(req.query));
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
    res.json(await eventService.updateEvent(parseInt(req.params.id), req.body));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await eventService.cancelEvent(parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Routes internes (appelées par booking/payment service)
router.patch('/:id/capacity/decrement', async (req, res) => {
  try {
    res.json(await eventService.decrementCapacity(parseInt(req.params.id), req.body.quantity));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id/capacity/restore', async (req, res) => {
  try {
    await eventService.incrementCapacity(parseInt(req.params.id), req.body.quantity);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
