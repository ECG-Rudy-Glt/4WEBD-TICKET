import bcrypt from 'bcrypt';
import pool, { replicaPool } from '../db.js';

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

function rowToUser(row) {
  return {
    id:        row.id,
    firstname: row.firstname,
    lastname:  row.lastname,
    email:     row.email,
    phone:     row.phone,
    role:      row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    password:  row.password, // gardé pour bcrypt.compare, retiré par sanitize()
  };
}

export async function createUser(data) {
  const existing = await replicaPool.query(
    'SELECT id FROM users WHERE email = $1', [data.email]
  );
  if (existing.rows.length > 0) {
    throw { status: 409, message: 'Cet email est déjà utilisé' };
  }

  const hashed = await bcrypt.hash(data.password, 10);
  const res = await pool.query(
    `INSERT INTO users (firstname, lastname, email, phone, password, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.firstname, data.lastname, data.email, data.phone || null, hashed, data.role || 'user']
  );
  return sanitize(rowToUser(res.rows[0]));
}

export async function findUserByEmail(email) {
  const res = await replicaPool.query(
    'SELECT * FROM users WHERE email = $1', [email]
  );
  if (res.rows.length === 0) return null;
  return rowToUser(res.rows[0]);
}

export async function getAllUsers({ page = 1, limit = 10, role } = {}) {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM users';
  const params = [];

  if (role) {
    params.push(role);
    query += ` WHERE role = $${params.length}`;
  }

  const countRes = await replicaPool.query(
    `SELECT COUNT(*) FROM users${role ? ' WHERE role = $1' : ''}`,
    role ? [role] : []
  );

  query += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const res = await replicaPool.query(query, params);
  const total = parseInt(countRes.rows[0].count);

  return {
    data: res.rows.map(r => sanitize(rowToUser(r))),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserById(id) {
  const res = await replicaPool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Utilisateur non trouvé' };
  return sanitize(rowToUser(res.rows[0]));
}

export async function updateUser(id, data) {
  if (data.email) {
    const existing = await replicaPool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2', [data.email, id]
    );
    if (existing.rows.length > 0) throw { status: 409, message: 'Cet email est déjà utilisé' };
  }

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`"${key}" = $${i++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) throw { status: 400, message: 'Aucune donnée à mettre à jour' };

  fields.push(`"updatedAt" = NOW()`);
  values.push(id);

  const res = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Utilisateur non trouvé' };
  return sanitize(rowToUser(res.rows[0]));
}

export async function deleteUser(id) {
  const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Utilisateur non trouvé' };
}

export { sanitize };
