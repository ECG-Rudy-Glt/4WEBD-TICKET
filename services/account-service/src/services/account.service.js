import { writePool, readPool } from '../db.js';

export async function createAccount(data) {
    const { rows } = await writePool.query(
        `INSERT INTO accounts (user_id, label, type, balance, created_at)
         VALUES ($1, $2, $3, 100, NOW())
         RETURNING id, user_id AS "userId", label, type, balance, created_at AS "createdAt"`,
        [data.userId, data.label, data.type]
    );
    return rows[0];
}

export async function getAccountsByUser(userId) {
    const { rows } = await readPool.query(
        `SELECT id, user_id AS "userId", label, type, balance, created_at AS "createdAt"
         FROM accounts WHERE user_id = $1`,
        [userId]
    );
    return rows;
}

export async function getAccountById(accountId) {
    const { rows } = await readPool.query(
        `SELECT id, user_id AS "userId", label, type, balance, created_at AS "createdAt"
         FROM accounts WHERE id = $1`,
        [accountId]
    );
    if (!rows[0]) throw { status: 404, message: "Compte non trouvé" };
    return rows[0];
}

export async function updateAccount(accountId, data) {
    const { rows } = await writePool.query(
        `UPDATE accounts SET label = COALESCE($1, label)
         WHERE id = $2
         RETURNING id, user_id AS "userId", label, type, balance, created_at AS "createdAt"`,
        [data.label, accountId]
    );
    if (!rows[0]) throw { status: 404, message: "Compte non trouvé" };
    return rows[0];
}

export async function deleteAccount(accountId) {
    const { rowCount } = await writePool.query(
        `DELETE FROM accounts WHERE id = $1`,
        [accountId]
    );
    if (rowCount === 0) throw { status: 404, message: "Compte non trouvé" };
}

export async function updateBalance(accountId, amount) {
    const { rows } = await writePool.query(
        `UPDATE accounts SET balance = balance + $1
         WHERE id = $2
         RETURNING id, user_id AS "userId", label, type, balance, created_at AS "createdAt"`,
        [amount, accountId]
    );
    if (!rows[0]) throw { status: 404, message: "Compte non trouvé" };
    return rows[0];
}
