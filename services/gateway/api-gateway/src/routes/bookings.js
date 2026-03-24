import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createBookingSchema } from '../schemas/booking.schema.js';
import { publishBooking } from '../services/queue.service.js';
import * as eventService from '../services/event.service.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
    try {
        const data  = createBookingSchema.parse(req.body);
        const event = await eventService.getEventById(data.eventId);

        if (event.status !== 'active') {
            return res.status(400).json({ error: "Cet événement n'est plus disponible" });
        }
        if (event.availableTickets < data.quantity) {
            return res.status(409).json({ error: "Plus assez de places disponibles" });
        }

        // Extract userId from JWT if present
        let userId = null;
        let userEmail = null;
        const auth = req.headers['authorization'];
        if (auth && auth.startsWith('Bearer ')) {
            try {
                const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
                userId = payload.id;
                userEmail = payload.email;
            } catch (_) {}
        }

        publishBooking({
            userId,
            userEmail,
            eventId:      event.id,
            eventTitle:   event.title,
            quantity:     data.quantity,
            priceInCents: event.priceInCents * data.quantity,
            cardToken:    data.cardToken
        });

        res.status(202).json({
            message: "Réservation en cours de traitement",
            data
        });
    } catch (err) {
        if (err.issues) {
            return res.status(400).json({ errors: err.issues });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
