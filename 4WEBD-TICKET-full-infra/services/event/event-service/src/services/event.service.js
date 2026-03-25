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
        priceInCents:      row.priceInCents,
        creatorId:         row.creatorId,
        status:            row.status,
        createdAt:         row.createdAt
    };
}

export async function createEvent(data) {
    const res = await pool.query(
        `INSERT INTO events (title, description, date, venue, "maxCapacity", "availableTickets", "priceInCents", "creatorId")
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING *`,
        [data.title, data.description || null, data.date, data.venue, data.maxCapacity, data.priceInCents, data.creatorId || null]
    );
    return rowToEvent(res.rows[0]);
}

export async function getAllEvents() {
    const res = await replicaPool.query(`SELECT * FROM events WHERE status = 'active' ORDER BY date ASC`);
    return res.rows.map(rowToEvent);
}

export async function getEventById(id) {
    const res = await replicaPool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (!res.rows.length) throw { status: 404, message: "Événement non trouvé" };
    return rowToEvent(res.rows[0]);
}

export async function updateEvent(id, data) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(data)) {
        fields.push(`"${key}" = $${i++}`);
        values.push(val);
    }
    if (!fields.length) throw { status: 400, message: "Aucun champ à modifier" };
    values.push(id);
    const res = await pool.query(
        `UPDATE events SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values
    );
    if (!res.rows.length) throw { status: 404, message: "Événement non trouvé" };
    return rowToEvent(res.rows[0]);
}

export async function deleteEvent(id) {
    const res = await pool.query(`UPDATE events SET status = 'cancelled' WHERE id = $1 RETURNING id`, [id]);
    if (!res.rows.length) throw { status: 404, message: "Événement non trouvé" };
}

// Décrémente atomiquement (anti-survente)
export async function decrementCapacity(id, quantity) {
    const res = await pool.query(
        `UPDATE events SET "availableTickets" = "availableTickets" - $1
         WHERE id = $2 AND "availableTickets" >= $1 RETURNING *`,
        [quantity, id]
    );
    if (!res.rows.length) throw { status: 409, message: "Plus assez de places disponibles" };
    return rowToEvent(res.rows[0]);
}

export async function restoreCapacity(id, quantity) {
    await pool.query(
        `UPDATE events SET "availableTickets" = "availableTickets" + $1 WHERE id = $2`,
        [quantity, id]
    );
}
