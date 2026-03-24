import amqp from 'amqplib';
import { processPayment } from './payment.service.js';

const RABBITMQ_URL  = process.env.RABBITMQ_URL;
const BOOKING_URL   = process.env.BOOKING_URL;
const EVENT_URL     = process.env.EVENT_URL;
const PAYMENT_QUEUE = 'payments';
const NOTIF_QUEUE   = 'notifications';

let notifChannel = null;

async function connectNotifQueue() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        notifChannel = await conn.createChannel();
        await notifChannel.assertQueue(NOTIF_QUEUE, { durable: true });
        console.log('[payment-service] Queue notifications connectée');
    } catch (err) {
        console.error('[payment-service] Erreur connexion queue notifs:', err.message);
        setTimeout(connectNotifQueue, 5000);
    }
}

connectNotifQueue();

export async function startConsumer() {
    try {
        const conn    = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        await channel.assertQueue(PAYMENT_QUEUE, { durable: true });
        channel.prefetch(1);

        console.log(`[payment-service] En attente sur la queue "${PAYMENT_QUEUE}"...`);

        channel.consume(PAYMENT_QUEUE, async (msg) => {
            if (!msg) return;
            const data = JSON.parse(msg.content.toString());
            console.log('[payment-service] Paiement reçu pour ticket:', data.ticketId);

            try {
                const payment = await processPayment(data);

                if (payment.status === 'success') {
                    // Met à jour le ticket → confirmed
                    await fetch(`${BOOKING_URL}/${data.ticketId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'confirmed', paymentId: payment.id })
                    });

                    // Notifie le succès
                    if (notifChannel) {
                        notifChannel.sendToQueue(NOTIF_QUEUE, Buffer.from(JSON.stringify({
                            type:           'payment_success',
                            userId:         data.userId,
                            userEmail:      data.userEmail,
                            eventTitle:     data.eventTitle,
                            quantity:       data.quantity,
                            amountInCents:  payment.amountInCents,
                            transactionRef: payment.transactionRef,
                            ticketCode:     data.ticketCode
                        })), { persistent: true });
                    }

                } else {
                    // Annule le ticket
                    await fetch(`${BOOKING_URL}/${data.ticketId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled' })
                    });

                    // Restaure les places
                    await fetch(`${EVENT_URL}/${data.eventId}/capacity/restore`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quantity: data.quantity })
                    });

                    // Notifie l'échec
                    if (notifChannel) {
                        notifChannel.sendToQueue(NOTIF_QUEUE, Buffer.from(JSON.stringify({
                            type:          'payment_failed',
                            userId:        data.userId,
                            userEmail:     data.userEmail,
                            eventTitle:    data.eventTitle,
                            amountInCents: data.priceInCents,
                            reason:        "Paiement refusé par la banque"
                        })), { persistent: true });
                    }
                }

                channel.ack(msg);
                console.log('[payment-service] Paiement traité:', payment.status);

            } catch (err) {
                console.error('[payment-service] Erreur:', err.message);
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('[payment-service] Erreur connexion RabbitMQ consumer:', err.message);
        setTimeout(startConsumer, 5000);
    }
}
