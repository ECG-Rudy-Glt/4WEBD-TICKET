import amqp from 'amqplib';
import { createTicket } from './ticket.service.js';

const RABBITMQ_URL   = process.env.RABBITMQ_URL;
const EVENT_URL      = process.env.EVENT_URL;
const BOOKING_QUEUE  = 'bookings';
const PAYMENT_QUEUE  = 'payments';
const NOTIF_QUEUE    = 'notifications';

let notifChannel = null;
let payChannel   = null;

async function connectOutputQueues() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        const ch   = await conn.createChannel();
        await ch.assertQueue(PAYMENT_QUEUE, { durable: true });
        await ch.assertQueue(NOTIF_QUEUE,   { durable: true });
        payChannel   = ch;
        notifChannel = ch;
        console.log('[booking-service] Queues de sortie connectées');
    } catch (err) {
        console.error('[booking-service] Erreur connexion queues sortie:', err.message);
        setTimeout(connectOutputQueues, 5000);
    }
}

connectOutputQueues();

export async function startConsumer() {
    try {
        const conn    = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        await channel.assertQueue(BOOKING_QUEUE, { durable: true });
        channel.prefetch(1);

        console.log(`[booking-service] En attente sur la queue "${BOOKING_QUEUE}"...`);

        channel.consume(BOOKING_QUEUE, async (msg) => {
            if (!msg) return;
            const data = JSON.parse(msg.content.toString());
            console.log('[booking-service] Réservation reçue:', data);

            try {
                // Décrémente les places (atomique, anti-survente)
                const response = await fetch(`${EVENT_URL}/${data.eventId}/capacity/decrement`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: data.quantity })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw { message: err.error || "Plus de places disponibles" };
                }

                const ticket = await createTicket(data);

                // Publie dans la queue payments
                payChannel.sendToQueue(PAYMENT_QUEUE, Buffer.from(JSON.stringify({
                    ticketId:     ticket.id,
                    ticketCode:   ticket.ticketCode,
                    userId:       data.userId,
                    userEmail:    data.userEmail,
                    eventId:      data.eventId,
                    eventTitle:   data.eventTitle,
                    quantity:     data.quantity,
                    priceInCents: ticket.priceInCents,
                    cardToken:    data.cardToken
                })), { persistent: true });

                channel.ack(msg);
                console.log('[booking-service] Ticket créé, transmis au payment-service');

            } catch (err) {
                console.error('[booking-service] Erreur:', err.message);

                // Notifie l'utilisateur de l'échec
                if (notifChannel) {
                    notifChannel.sendToQueue(NOTIF_QUEUE, Buffer.from(JSON.stringify({
                        type:       'booking_failed',
                        userId:     data.userId,
                        userEmail:  data.userEmail,
                        eventTitle: data.eventTitle,
                        reason:     err.message
                    })), { persistent: true });
                }

                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('[booking-service] Erreur connexion RabbitMQ consumer:', err.message);
        setTimeout(startConsumer, 5000);
    }
}
