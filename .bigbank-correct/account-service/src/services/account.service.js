import pool from '../db.js';
import { replicaPool } from '../db.js';

export async function createAccount(data) {
    const res = await pool.query(
        'INSERT INTO accounts ("userId", label, type, balance) VALUES ($1, $2, $3, 100) RETURNING *', [data.userId, data.label, data.type]
    );

    const row = res.rows[0];
    return {
        id: row.id,
        userId: row.userId,
        label:row.label,
        type: row.type,
        balance: parseFloat(row.balance),
        createdAt: new Date().toISOString?.() || row.createdAt
    };
}

export async function getAccountsByUser(userId) {
    const res = await replicaPool.query('SELECT * FROM accounts WHERE "userId" = $1 ORDER BY id', [userId]);
    return res.rows.map(rowToAccount);
}

export async function getAccountById(accountId) {
    const res = await replicaPool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

export async function updateAccount(accountId, data) {
    const res = await pool.query(
        'UPDATE accounts SET label = COALESCE($2, label) WHERE id = $1 RETURNING *',
        [accountId, data.label]
    );
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

export async function deleteAccount(accountId) {
    const res = await pool.query('DELETE FROM accounts WHERE id = $1 RETURNING id', [accountId]);
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
}

export async function updateBalance(accountId, amount) {
    const res = await pool.query(
        'UPDATE accounts SET balance = balance + $2 WHERE id = $1 RETURNING *',
        [accountId, amount]
    );
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

function rowToAccount(row) {
    return {
        id: row.id,
        userId: row.userId,
        label: row.label,
        type: row.type,
        balance: parseFloat(row.balance),
        createdAt: row.createdAt?.toISOString?.() || row.createdAt
    };
}