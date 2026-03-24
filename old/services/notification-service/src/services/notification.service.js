import pool from '../db.js';

export async function sendNotification(data) {
  const body = formatBody(data);
  console.log(`[notification] ${data.type} -> ${data.userEmail}\n${body}`);
  const res = await pool.query(
    `INSERT INTO notifications ("userId", type, recipient, body) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.userId, data.type, data.userEmail, body]
  );
  return res.rows[0];
}

function formatBody(d) {
  if (d.type === 'payment_success') {
    return [
      `Reservation confirmee pour : ${d.eventTitle}`,
      `Billet(s) : ${d.quantity}`,
      `Montant : ${(d.amountInCents / 100).toFixed(2)} EUR`,
      `Reference : ${d.transactionRef}`,
    ].join('\n');
  }
  if (d.type === 'payment_failed') {
    return [
      `Echec du paiement pour : ${d.eventTitle}`,
      `Montant : ${(d.amountInCents / 100).toFixed(2)} EUR`,
      `Raison : ${d.reason}`,
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
