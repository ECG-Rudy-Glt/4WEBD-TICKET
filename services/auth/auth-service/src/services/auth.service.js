import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
}

export async function register(data) {
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

    const user = sanitize(res.rows[0]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    return { user, token };
}

export async function login(data) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [data.email]);
    if (!res.rows.length) {
        throw { status: 401, message: "Email ou mot de passe invalide" };
    }

    const user = res.rows[0];
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
        throw { status: 401, message: "Email ou mot de passe invalide" };
    }

    const safe  = sanitize(user);
    const token = jwt.sign({ id: safe.id, email: safe.email, role: safe.role }, JWT_SECRET, { expiresIn: '24h' });
    return { user: safe, token };
}

export async function getAllUsers() {
    const res = await pool.query('SELECT id, firstname, lastname, email, phone, role, "createdAt" FROM users ORDER BY id');
    return res.rows;
}
