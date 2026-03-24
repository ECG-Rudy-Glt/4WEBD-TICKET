import { Router } from 'express';
import { updateTicketStatusSchema } from '../schemas/ticket.schema.js';
import * as ticketService from '../services/ticket.service.js';

const router = Router();

// GET /tickets — liste tous les tickets (admin)
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await ticketService.getAllTickets({ page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /tickets/user/:userId — tickets d'un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await ticketService.getTicketsByUser(parseInt(req.params.userId), { page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /tickets/event/:eventId — tickets d'un événement
router.get('/event/:eventId', async (req, res) => {
  try {
    const tickets = await ticketService.getTicketsByEvent(parseInt(req.params.eventId));
    res.json(tickets);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /tickets/:id — détail d'un ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await ticketService.getTicketById(parseInt(req.params.id));
    res.json(ticket);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /tickets/:id/status — mise à jour statut (interne: payment-service)
router.patch('/:id/status', async (req, res) => {
  try {
    const data   = updateTicketStatusSchema.parse(req.body);
    const ticket = await ticketService.updateTicketStatus(parseInt(req.params.id), data);
    res.json(ticket);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
