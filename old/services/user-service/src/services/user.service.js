import pool from '../db.js';

export async function createUser(data) {
  const res = await pool.query(
    `INSERT INTO users ("authId", firstname, lastname, email, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.authId, data.firstname, data.lastname, data.email, data.role || 'user']
  );
  return res.rows[0];
}

export async function getAllUsers() {
  const res = await pool.query('SELECT * FROM users ORDER BY id');
  return res.rows;
}

export async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!res.rows.length) throw { status: 404, message: 'Utilisateur introuvable' };
  return res.rows[0];
}

export async function getUserByAuthId(authId) {
  const res = await pool.query('SELECT * FROM users WHERE "authId" = $1', [authId]);
  if (!res.rows.length) throw { status: 404, message: 'Utilisateur introuvable' };
  return res.rows[0];
}

export async function updateUser(authId, data) {
  const fields = [];
  const values = [];
  let i = 1;
  if (data.firstname) { fields.push(`firstname = $${i++}`); values.push(data.firstname); }
  if (data.lastname)  { fields.push(`lastname = $${i++}`);  values.push(data.lastname); }
  if (data.email)     { fields.push(`email = $${i++}`);     values.push(data.email); }
  if (!fields.length) throw { status: 400, message: 'Aucun champ à modifier' };
  values.push(authId);
  const res = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE "authId" = $${i} RETURNING *`,
    values
  );
  if (!res.rows.length) throw { status: 404, message: 'Utilisateur introuvable' };
  return res.rows[0];
}

export async function deleteUser(authId) {
  await pool.query('DELETE FROM users WHERE "authId" = $1', [authId]);
}
