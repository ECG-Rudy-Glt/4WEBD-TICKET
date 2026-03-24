import { randomUUID } from 'crypto';
import pool, { replicaPool } from '../db.js';

const FAILURE_RATE = parseFloat(process.env.SIMULATE_FAILURE_RATE || '0.1');

export async function processPayment(data) {
    const transactionRef = `PAY-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const failed         = Math.random() < FAILURE_RATE;
    const status         = failed ? 'failed' : 'success';

    const res = await pool.query(
        `INSERT INTO payments ("ticketId", "userId", "eventId", "amountInCents", status, "transactionRef", "processedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [data.ticketId, data.userId, data.eventId, data.priceInCents, status, transactionRef]
    );
    return res.rows[0];
}

export async function getAllPayments() {
    const res = await replicaPool.query('SELECT * FROM payments ORDER BY "createdAt" DESC');
    return res.rows;
}

export async function getPaymentById(id) {
    const res = await replicaPool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (!res.rows.length) throw { status: 404, message: "Paiement non trouvé" };
    return res.rows[0];
}

export async function getPaymentsByUser(userId) {
    const res = await replicaPool.query('SELECT * FROM payments WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return res.rows;
}
