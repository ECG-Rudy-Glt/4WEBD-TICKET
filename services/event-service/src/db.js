import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://event_user:event_pass@localhost:5432/event_db',
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await primaryPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id                 SERIAL PRIMARY KEY,
        title              VARCHAR(255) NOT NULL,
        description        TEXT,
        date               TIMESTAMPTZ NOT NULL,
        venue              VARCHAR(255) NOT NULL,
        "maxCapacity"      INTEGER NOT NULL CHECK ("maxCapacity" > 0),
        "availableTickets" INTEGER NOT NULL CHECK ("availableTickets" >= 0),
        "priceInCents"     INTEGER NOT NULL CHECK ("priceInCents" > 0),
        "creatorId"        INTEGER NOT NULL,
        status             VARCHAR(20) NOT NULL DEFAULT 'active',
        "createdAt"        TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt"        TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date);
    `);
    console.log('[event-service] DB initialisée');
  } finally {
    client.release();
  }
}

export default primaryPool;
export { replicaPool };
