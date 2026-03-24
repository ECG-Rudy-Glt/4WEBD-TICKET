import pool, { replicaPool } from '../db.js';

const TEMPLATES = {
  payment_success: (d) => ({
    subject: `Billet confirmé — ${d.eventTitle}`,
    body: [
      `Bonjour,`,
      ``,
      `Votre réservation est confirmée !`,
      ``,
      `  Événement   : ${d.eventTitle}`,
      `  Billet(s)   : ${d.quantity} place(s)`,
      `  Code billet : ${d.ticketCode}`,
      `  Montant     : ${(d.amountInCents / 100).toFixed(2)} €`,
      `  CB utilisée : **** **** **** ${d.cardLast4}`,
      `  Référence   : ${d.transactionRef}`,
      ``,
      `Conservez ce code — il vous sera demandé à l'entrée.`,
      ``,
      `À bientôt !`,
    ].join('\n'),
  }),

  payment_failed: (d) => ({
    subject: `Échec du paiement — ${d.eventTitle}`,
    body: [
      `Bonjour,`,
      ``,
      `Votre paiement pour "${d.eventTitle}" a échoué.`,
      ``,
      `  Montant  : ${(d.amountInCents / 100).toFixed(2)} €`,
      `  Raison   : ${d.reason}`,
      ``,
      `Votre réservation a été annulée et les places remises en vente.`,
      `Vous pouvez réessayer sur notre plateforme.`,
    ].join('\n'),
  }),

  booking_failed: (d) => ({
    subject: `Réservation impossible — ${d.eventTitle || 'Événement'}`,
    body: [
      `Bonjour,`,
      ``,
      `Votre demande de réservation n'a pas pu aboutir.`,
      ``,
      `  Raison : ${d.reason}`,
      ``,
      `Les places peuvent être limitées. Tentez votre chance sur un autre événement !`,
    ].join('\n'),
  }),
};

export async function sendNotification(data) {
  const template = TEMPLATES[data.type];
  const { subject, body } = template
    ? template(data)
    : { subject: `Notification : ${data.type}`, body: JSON.stringify(data) };

  const timestamp = new Date().toLocaleString('fr-FR');

  // Log simulant l'envoi email/SMS
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║  NOTIFICATION SERVICE — ${timestamp}`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Type      : ${data.type}`);
  console.log(`║  Pour      : ${data.userEmail}`);
  console.log(`║  Sujet     : ${subject}`);
  console.log('╠══════════════════════════════════════════════╣');
  body.split('\n').forEach(line => console.log(`║  ${line}`));
  console.log('╚══════════════════════════════════════════════╝');

  // Persistance en DB
  const res = await pool.query(
    `INSERT INTO notifications ("userId", type, channel, recipient, subject, body, status)
     VALUES ($1, $2, 'email', $3, $4, $5, 'sent')
     RETURNING *`,
    [data.userId, data.type, data.userEmail, subject, body]
  );

  return res.rows[0];
}

export async function getAllNotifications({ page = 1, limit = 10 } = {}) {
  const offset   = (page - 1) * limit;
  const countRes = await replicaPool.query('SELECT COUNT(*) FROM notifications');
  const res      = await replicaPool.query(
    'SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getNotificationsByUser(userId, { page = 1, limit = 10 } = {}) {
  const offset   = (page - 1) * limit;
  const countRes = await replicaPool.query(
    'SELECT COUNT(*) FROM notifications WHERE "userId" = $1', [userId]
  );
  const res = await replicaPool.query(
    'SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
