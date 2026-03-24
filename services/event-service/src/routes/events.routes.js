import { Router } from 'express';
import { createEventSchema, updateEventSchema, queryEventSchema } from '../schemas/event.schema.js';
import * as eventService from '../services/event.service.js';

const router = Router();

// POST /events — créer un événement (operator/admin)
router.post('/', async (req, res) => {
  try {
    const creatorId = parseInt(req.headers['x-user-id']);
    if (!creatorId) return res.status(401).json({ error: 'Non authentifié' });

    const data = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(data, creatorId);
    res.status(201).json(event);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /events — liste avec filtres
router.get('/', async (req, res) => {
  try {
    const query = queryEventSchema.parse(req.query);
    const result = await eventService.getAllEvents(query);
    res.json(result);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await eventService.getEventById(parseInt(req.params.id));
    res.json(event);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /events/:id — mise à jour (admin ou créateur)
router.put('/:id', async (req, res) => {
  try {
    const requesterId   = parseInt(req.headers['x-user-id']);
    const requesterRole = req.headers['x-user-role'];
    if (!requesterId) return res.status(401).json({ error: 'Non authentifié' });

    const data = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(parseInt(req.params.id), data, requesterId, requesterRole);
    res.json(event);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /events/:id — annulation (admin ou créateur)
router.delete('/:id', async (req, res) => {
  try {
    const requesterId   = parseInt(req.headers['x-user-id']);
    const requesterRole = req.headers['x-user-role'];
    if (!requesterId) return res.status(401).json({ error: 'Non authentifié' });

    const event = await eventService.cancelEvent(parseInt(req.params.id), requesterId, requesterRole);
    res.json(event);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /events/:id/capacity — route interne pour booking-service (décrémenter)
router.patch('/:id/capacity/decrement', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantité invalide' });
    const event = await eventService.decrementCapacity(parseInt(req.params.id), quantity);
    res.json(event);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /events/:id/capacity/restore — route interne pour payment-service (rollback)
router.patch('/:id/capacity/restore', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantité invalide' });
    const event = await eventService.incrementCapacity(parseInt(req.params.id), quantity);
    res.json(event);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
