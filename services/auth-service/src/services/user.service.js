import bcrypt from 'bcrypt';
import pool from '../db.js';

export async function createUser(data) {
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
  if (exists.rows.length) throw { status: 409, message: 'Email déjà utilisé' };

  const hashed = await bcrypt.hash(data.password, 10);
  const res = await pool.query(
    `INSERT INTO users (firstname, lastname, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.firstname, data.lastname, data.email, hashed, data.role || 'user']
  );
  const { password, ...user } = res.rows[0];
  return user;
}

export async function findUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}
