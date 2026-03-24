import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://event_user:event_pass@event-db:5432/event_db',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id                 SERIAL PRIMARY KEY,
      title              VARCHAR(255) NOT NULL,
      description        TEXT,
      date               TIMESTAMPTZ NOT NULL,
      venue              VARCHAR(255) NOT NULL,
      "maxCapacity"      INTEGER NOT NULL,
      "availableTickets" INTEGER NOT NULL,
      "priceInCents"     INTEGER NOT NULL,
      "creatorId"        INTEGER NOT NULL,
      status             VARCHAR(20) NOT NULL DEFAULT 'active',
      "createdAt"        TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[event-service] DB ready');
}

export default pool;
