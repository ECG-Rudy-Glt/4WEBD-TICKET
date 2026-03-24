import { Router } from 'express';
import * as ticketService from '../services/ticket.service.js';

const router = Router();

router.get('/',            async (_req, res) => { try { res.json(await ticketService.getAllTickets()); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/user/:id',    async (req, res)  => { try { res.json(await ticketService.getTicketsByUser(parseInt(req.params.id))); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/event/:id',   async (req, res)  => { try { res.json(await ticketService.getTicketsByEvent(parseInt(req.params.id))); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id',         async (req, res)  => { try { res.json(await ticketService.getTicketById(parseInt(req.params.id))); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });

router.patch('/:id/status', async (req, res) => {
  try {
    const ticket = await ticketService.updateTicketStatus(parseInt(req.params.id), req.body.status, req.body.paymentId);
    res.json(ticket);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
