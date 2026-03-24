import pool, { replicaPool } from '../db.js';

function rowToEvent(row) {
  return {
    id:                row.id,
    title:             row.title,
    description:       row.description,
    date:              row.date,
    venue:             row.venue,
    maxCapacity:       row.maxCapacity,
    availableTickets:  row.availableTickets,
    priceInCents:      parseInt(row.priceInCents),
    creatorId:         row.creatorId,
    status:            row.status,
    createdAt:         row.createdAt,
    updatedAt:         row.updatedAt,
  };
}

export async function createEvent(data, creatorId) {
  const res = await pool.query(
    `INSERT INTO events
       (title, description, date, venue, "maxCapacity", "availableTickets", "priceInCents", "creatorId")
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
     RETURNING *`,
    [data.title, data.description || null, data.date, data.venue,
     data.maxCapacity, data.priceInCents, creatorId]
  );
  return rowToEvent(res.rows[0]);
}

export async function getAllEvents({ page = 1, limit = 10, status, venue, from, to } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let i = 1;

  if (status) { conditions.push(`status = $${i++}`); params.push(status); }
  if (venue)  { conditions.push(`venue ILIKE $${i++}`); params.push(`%${venue}%`); }
  if (from)   { conditions.push(`date >= $${i++}`); params.push(from); }
  if (to)     { conditions.push(`date <= $${i++}`); params.push(to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await replicaPool.query(`SELECT COUNT(*) FROM events ${where}`, params);
  const res = await replicaPool.query(
    `SELECT * FROM events ${where} ORDER BY date ASC LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  const total = parseInt(countRes.rows[0].count);
  return {
    data: res.rows.map(rowToEvent),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getEventById(id) {
  const res = await replicaPool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Événement non trouvé' };
  return rowToEvent(res.rows[0]);
}

// Lecture sur le PRIMARY pour avoir la valeur fraîche (utilisé par booking-service)
export async function getEventByIdFresh(id) {
  const res = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (res.rows.length === 0) throw { status: 404, message: 'Événement non trouvé' };
  return rowToEvent(res.rows[0]);
}

export async function updateEvent(id, data, requesterId, requesterRole) {
  const event = await getEventByIdFresh(id);

  if (requesterRole !== 'admin' && event.creatorId !== requesterId) {
    throw { status: 403, message: 'Vous n\'êtes pas autorisé à modifier cet événement' };
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
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rowToEvent(res.rows[0]);
}

export async function cancelEvent(id, requesterId, requesterRole) {
  const event = await getEventByIdFresh(id);

  if (requesterRole !== 'admin' && event.creatorId !== requesterId) {
    throw { status: 403, message: 'Vous n\'êtes pas autorisé à annuler cet événement' };
  }
  if (event.status === 'cancelled') {
    throw { status: 400, message: 'L\'événement est déjà annulé' };
  }

  const res = await pool.query(
    `UPDATE events SET status = 'cancelled', "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rowToEvent(res.rows[0]);
}

// Appelé par booking-service (interne) pour décrémenter les places
export async function decrementCapacity(id, quantity) {
  const res = await pool.query(
    `UPDATE events
     SET "availableTickets" = "availableTickets" - $2,
         status = CASE WHEN "availableTickets" - $2 = 0 THEN 'sold_out' ELSE status END,
         "updatedAt" = NOW()
     WHERE id = $1 AND "availableTickets" >= $2
     RETURNING *`,
    [id, quantity]
  );
  if (res.rows.length === 0) {
    throw { status: 409, message: 'Plus de places disponibles' };
  }
  return rowToEvent(res.rows[0]);
}

// Appelé par payment-service en cas de paiement échoué pour rollback
export async function incrementCapacity(id, quantity) {
  const res = await pool.query(
    `UPDATE events
     SET "availableTickets" = "availableTickets" + $2,
         status = CASE WHEN status = 'sold_out' THEN 'active' ELSE status END,
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, quantity]
  );
  if (res.rows.length === 0) throw { status: 404, message: 'Événement non trouvé' };
  return rowToEvent(res.rows[0]);
}
