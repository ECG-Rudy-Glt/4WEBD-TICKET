import bcrypt from 'bcrypt';
import pool from '../db.js';

function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
}

export async function createUser(data) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length) {
        throw { status: 409, message: "Cet email est déjà utilisé" };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const res = await pool.query(
        `INSERT INTO users (firstname, lastname, email, phone, password, role)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.firstname, data.lastname, data.email, data.phone || null, hashedPassword, data.role || 'user']
    );
    return sanitize(res.rows[0]);
}

export async function getAllUsers(role) {
    let res;
    if (role) {
        res = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY id', [role]);
    } else {
        res = await pool.query('SELECT * FROM users ORDER BY id');
    }
    return res.rows.map(sanitize);
}

export async function getUserByEmail(email) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!res.rows.length) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    return res.rows[0]; // password inclus — usage interne auth-service
}

export async function getUserById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!res.rows.length) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    return sanitize(res.rows[0]);
}

export async function updateUser(id, data) {
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!existing.rows.length) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }

    if (data.email && data.email !== existing.rows[0].email) {
        const emailTaken = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
        if (emailTaken.rows.length) {
            throw { status: 409, message: "Cet email est déjà utilisé" };
        }
    }

    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }

    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(data)) {
        fields.push(`${key} = $${i++}`);
        values.push(val);
    }
    values.push(id);

    const res = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values
    );
    return sanitize(res.rows[0]);
}

export async function deleteUser(id) {
    const res = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (!res.rows.length) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
}
