import { randomUUID } from 'crypto';
import pool, { replicaPool } from '../db.js';

function rowToPayment(row) {
  return {
    id:             row.id,
    ticketId:       row.ticketId,
    userId:         row.userId,
    eventId:        row.eventId,
    amountInCents:  parseInt(row.amountInCents),
    cardLast4:      row.cardLast4,
    status:         row.status,
    transactionRef: row.transactionRef,
    processedAt:    row.processedAt,
    createdAt:      row.createdAt,
  };
}

function extractCardLast4(cardToken) {
  // Extrait les 4 derniers chiffres du token simulé ex: "tok_visa_4242" → "4242"
  const match = cardToken?.match(/\d{4}$/);
  return match ? match[0] : '0000';
}

export async function processPayment({ ticketId, userId, eventId, amountInCents, cardToken }) {
  const transactionRef = `PAY-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const cardLast4      = extractCardLast4(cardToken);
  const failureRate    = parseFloat(process.env.SIMULATE_FAILURE_RATE || '0');
  const success        = Math.random() >= failureRate;

  const res = await pool.query(
    `INSERT INTO payments
       ("ticketId", "userId", "eventId", "amountInCents", "cardLast4", status, "transactionRef", "processedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [ticketId, userId, eventId, amountInCents, cardLast4,
     success ? 'completed' : 'failed', transactionRef]
  );

  return { payment: rowToPayment(res.rows[0]), success };
}

export async function getAllPayments({ page = 1, limit = 10 } = {}) {
  const offset   = (page - 1) * limit;
  const countRes = await replicaPool.query('SELECT COUNT(*) FROM payments');
  const res      = await replicaPool.query(
    'SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToPayment),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPaymentById(id) {
  const res = await replicaPool.query('SELECT * FROM payments WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Paiement non trouvé' };
  return rowToPayment(res.rows[0]);
}

export async function getPaymentsByUser(userId, { page = 1, limit = 10 } = {}) {
  const offset   = (page - 1) * limit;
  const countRes = await replicaPool.query(
    'SELECT COUNT(*) FROM payments WHERE "userId" = $1', [userId]
  );
  const res = await replicaPool.query(
    'SELECT * FROM payments WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToPayment),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPaymentByTicket(ticketId) {
  const res = await replicaPool.query(
    'SELECT * FROM payments WHERE "ticketId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [ticketId]
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Paiement non trouvé pour ce billet' };
  return rowToPayment(res.rows[0]);
}
