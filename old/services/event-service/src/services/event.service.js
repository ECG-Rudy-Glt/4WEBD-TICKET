import pool from '../db.js';

export async function createEvent(data) {
  const res = await pool.query(
    `INSERT INTO events (title, description, date, venue, "maxCapacity", "availableTickets", "priceInCents", "creatorId")
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING *`,
    [data.title, data.description || null, data.date, data.venue, data.maxCapacity, data.priceInCents, data.creatorId]
  );
  return res.rows[0];
}

export async function getAllEvents(filters = {}) {
  const conditions = ['status != \'cancelled\''];
  const values = [];
  let i = 1;
  if (filters.venue)  { conditions.push(`venue ILIKE $${i++}`); values.push(`%${filters.venue}%`); }
  if (filters.from)   { conditions.push(`date >= $${i++}`);     values.push(filters.from); }
  if (filters.to)     { conditions.push(`date <= $${i++}`);     values.push(filters.to); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await pool.query(`SELECT * FROM events ${where} ORDER BY date ASC`, values);
  return res.rows;
}

export async function getEventById(id) {
  const res = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (!res.rows.length) throw { status: 404, message: 'Événement introuvable' };
  return res.rows[0];
}

export async function updateEvent(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  if (data.title)       { fields.push(`title = $${i++}`);       values.push(data.title); }
  if (data.description) { fields.push(`description = $${i++}`); values.push(data.description); }
  if (data.date)        { fields.push(`date = $${i++}`);        values.push(data.date); }
  if (data.venue)       { fields.push(`venue = $${i++}`);       values.push(data.venue); }
  if (data.priceInCents){ fields.push(`"priceInCents" = $${i++}`); values.push(data.priceInCents); }
  if (data.status)      { fields.push(`status = $${i++}`);      values.push(data.status); }
  if (!fields.length)   throw { status: 400, message: 'Aucun champ à modifier' };
  values.push(id);
  const res = await pool.query(
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!res.rows.length) throw { status: 404, message: 'Événement introuvable' };
  return res.rows[0];
}

export async function cancelEvent(id) {
  await pool.query('UPDATE events SET status = \'cancelled\' WHERE id = $1', [id]);
}

// Décrémente les places disponibles de façon atomique (anti-survente)
export async function decrementCapacity(id, quantity) {
  const res = await pool.query(
    `UPDATE events SET "availableTickets" = "availableTickets" - $1
     WHERE id = $2 AND "availableTickets" >= $1 RETURNING *`,
    [quantity, id]
  );
  if (!res.rows.length) throw { status: 409, message: 'Plus de places disponibles' };
  return res.rows[0];
}

// Restaure les places en cas d'annulation
export async function incrementCapacity(id, quantity) {
  await pool.query(
    `UPDATE events SET "availableTickets" = "availableTickets" + $1 WHERE id = $2`,
    [quantity, id]
  );
}
