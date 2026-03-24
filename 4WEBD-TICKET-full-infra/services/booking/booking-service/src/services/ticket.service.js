import { randomUUID } from 'crypto';
import pool, { replicaPool } from '../db.js';

export async function createTicket(data) {
    const res = await pool.query(
        `INSERT INTO tickets ("eventId", "userId", "ticketCode", "priceInCents", quantity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.eventId, data.userId, randomUUID(), data.priceInCents, data.quantity || 1]
    );
    return res.rows[0];
}

export async function getAllTickets() {
    const res = await replicaPool.query('SELECT * FROM tickets ORDER BY "createdAt" DESC');
    return res.rows;
}

export async function getTicketsByUser(userId) {
    const res = await replicaPool.query('SELECT * FROM tickets WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return res.rows;
}

export async function getTicketsByEvent(eventId) {
    const res = await replicaPool.query('SELECT * FROM tickets WHERE "eventId" = $1', [eventId]);
    return res.rows;
}

export async function getTicketById(id) {
    const res = await replicaPool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!res.rows.length) throw { status: 404, message: "Ticket non trouvé" };
    return res.rows[0];
}

export async function updateTicketStatus(id, status, paymentId = null) {
    const res = await pool.query(
        `UPDATE tickets SET status = $1, "paymentId" = $2 WHERE id = $3 RETURNING *`,
        [status, paymentId, id]
    );
    if (!res.rows.length) throw { status: 404, message: "Ticket non trouvé" };
    return res.rows[0];
}
