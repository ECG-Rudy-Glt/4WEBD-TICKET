import { Router } from 'express';
import * as paymentService from '../services/payment.service.js';

const router = Router();

// GET /payments — liste tous les paiements (admin)
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await paymentService.getAllPayments({ page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /payments/user/:userId — paiements d'un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await paymentService.getPaymentsByUser(parseInt(req.params.userId), { page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /payments/ticket/:ticketId — paiement d'un ticket
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByTicket(parseInt(req.params.ticketId));
    res.json(payment);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /payments/:id — détail d'un paiement
router.get('/:id', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(parseInt(req.params.id));
    res.json(payment);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
