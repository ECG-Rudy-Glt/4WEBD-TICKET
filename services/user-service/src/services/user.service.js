import pool, { replicaPool } from '../db.js';

function rowToProfile(row) {
  return {
    id:        row.id,
    authId:    row.authId,
    firstname: row.firstname,
    lastname:  row.lastname,
    email:     row.email,
    phone:     row.phone,
    avatar:    row.avatar,
    bio:       row.bio,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createProfile(data) {
  const existing = await replicaPool.query(
    'SELECT id FROM profiles WHERE "authId" = $1', [data.authId]
  );
  if (existing.rows.length > 0) {
    throw { status: 409, message: 'Profil déjà existant pour cet utilisateur' };
  }

  const res = await pool.query(
    `INSERT INTO profiles ("authId", firstname, lastname, email, phone, avatar, bio)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.authId, data.firstname, data.lastname, data.email,
     data.phone || null, data.avatar || null, data.bio || null]
  );
  return rowToProfile(res.rows[0]);
}

export async function getAllProfiles({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await replicaPool.query('SELECT COUNT(*) FROM profiles');
  const res = await replicaPool.query(
    'SELECT * FROM profiles ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToProfile),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProfileByAuthId(authId) {
  const res = await replicaPool.query(
    'SELECT * FROM profiles WHERE "authId" = $1', [authId]
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Profil non trouvé' };
  return rowToProfile(res.rows[0]);
}

export async function getProfileById(id) {
  const res = await replicaPool.query('SELECT * FROM profiles WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Profil non trouvé' };
  return rowToProfile(res.rows[0]);
}

export async function updateProfile(authId, data) {
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
  values.push(authId);

  const res = await pool.query(
    `UPDATE profiles SET ${fields.join(', ')} WHERE "authId" = $${i} RETURNING *`,
    values
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Profil non trouvé' };
  return rowToProfile(res.rows[0]);
}

export async function deleteProfile(authId) {
  const res = await pool.query(
    'DELETE FROM profiles WHERE "authId" = $1 RETURNING id', [authId]
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Profil non trouvé' };
}
