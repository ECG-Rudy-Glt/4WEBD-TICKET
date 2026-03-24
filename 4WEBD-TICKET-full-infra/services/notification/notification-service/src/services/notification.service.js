import pool from '../db.js';

export async function saveAndLog(data) {
    const body = formatBody(data);
    const timestamp = new Date().toLocaleString('fr-FR');

    console.log("\n===================================");
    console.log("NOTIFICATION SERVICE");
    console.log("===================================");
    console.log(`Date      : ${timestamp}`);
    console.log(`Type      : ${data.type}`);
    console.log(`Pour      : ${data.userEmail || 'N/A'}`);
    console.log(`Message   :\n${body}`);
    console.log("===================================\n");

    await pool.query(
        `INSERT INTO notifications ("userId", type, recipient, body) VALUES ($1, $2, $3, $4)`,
        [data.userId || null, data.type, data.userEmail || null, body]
    );
}

function formatBody(d) {
    if (d.type === 'payment_success') {
        return [
            `Reservation confirmee pour : ${d.eventTitle}`,
            `Billet(s) : ${d.quantity}`,
            `Montant : ${(d.amountInCents / 100).toFixed(2)} EUR`,
            `Reference : ${d.transactionRef}`,
            `Code billet : ${d.ticketCode}`
        ].join('\n');
    }
    if (d.type === 'payment_failed') {
        return [
            `Echec du paiement pour : ${d.eventTitle}`,
            `Montant : ${(d.amountInCents / 100).toFixed(2)} EUR`,
            `Raison : ${d.reason}`
        ].join('\n');
    }
    if (d.type === 'booking_failed') {
        return `Reservation impossible pour : ${d.eventTitle || 'evenement'}\nRaison : ${d.reason}`;
    }
    return JSON.stringify(d);
}

export async function getAllNotifications() {
    const res = await pool.query('SELECT * FROM notifications ORDER BY "createdAt" DESC');
    return res.rows;
}

export async function getNotificationsByUser(userId) {
    const res = await pool.query(
        'SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]
    );
    return res.rows;
}
