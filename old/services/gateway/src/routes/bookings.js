import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';
import { getChannel } from '../rabbitmq.js';

const router = Router();

const EVENT_URL = process.env.EVENT_URL || 'http://event-service:3003';

// POST /bookings — acheter un ticket (async via RabbitMQ)
router.post('/', authenticate, async (req, res) => {
  try {
    const { eventId, quantity = 1, cardToken } = req.body;

    if (!eventId || !cardToken) {
      return res.status(400).json({ error: 'eventId et cardToken requis' });
    }

    // Récupère les infos de l'événement
    const eventRes = await axios.get(`${EVENT_URL}/events/${eventId}`);
    const event = eventRes.data;

    if (event.status !== 'active') {
      return res.status(400).json({ error: 'Cet événement n\'est plus disponible' });
    }
    if (event.availableTickets < quantity) {
      return res.status(409).json({ error: 'Plus assez de places disponibles' });
    }

    // Publie dans la queue bookings
    getChannel().sendToQueue('bookings', Buffer.from(JSON.stringify({
      userId:       req.user.id,
      userEmail:    req.user.email,
      eventId:      event.id,
      eventTitle:   event.title,
      quantity,
      priceInCents: event.priceInCents * quantity,
      cardToken,
    })), { persistent: true });

    res.status(202).json({ message: 'Réservation en cours de traitement' });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: err.message });
  }
});

export default router;
