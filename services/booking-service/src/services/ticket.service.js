import { randomUUID } from 'crypto';
import pool, { replicaPool } from '../db.js';

function rowToTicket(row) {
  return {
    id:           row.id,
    eventId:      row.eventId,
    userId:       row.userId,
    ticketCode:   row.ticketCode,
    status:       row.status,
    paymentId:    row.paymentId,
    priceInCents: parseInt(row.priceInCents),
    quantity:     row.quantity,
    createdAt:    row.createdAt,
    updatedAt:    row.updatedAt,
  };
}

export async function createTicket({ eventId, userId, priceInCents, quantity }) {
  const ticketCode = randomUUID();
  const res = await pool.query(
    `INSERT INTO tickets ("eventId", "userId", "ticketCode", "priceInCents", quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [eventId, userId, ticketCode, priceInCents, quantity]
  );
  return rowToTicket(res.rows[0]);
}

export async function getAllTickets({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await replicaPool.query('SELECT COUNT(*) FROM tickets');
  const res = await replicaPool.query(
    'SELECT * FROM tickets ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToTicket),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTicketsByUser(userId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await replicaPool.query(
    'SELECT COUNT(*) FROM tickets WHERE "userId" = $1', [userId]
  );
  const res = await replicaPool.query(
    'SELECT * FROM tickets WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToTicket),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTicketsByEvent(eventId) {
  const res = await replicaPool.query(
    'SELECT * FROM tickets WHERE "eventId" = $1 ORDER BY "createdAt" DESC', [eventId]
  );
  return res.rows.map(rowToTicket);
}

export async function getTicketById(id) {
  const res = await replicaPool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Billet non trouvé' };
  return rowToTicket(res.rows[0]);
}

export async function updateTicketStatus(id, { status, paymentId }) {
  const res = await pool.query(
    `UPDATE tickets
     SET status = $2, "paymentId" = COALESCE($3, "paymentId"), "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, paymentId || null]
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Billet non trouvé' };
  return rowToTicket(res.rows[0]);
}
