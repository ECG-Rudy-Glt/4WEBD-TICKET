import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://booking_user:booking_pass@localhost:5432/booking_db',
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await primaryPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id             SERIAL PRIMARY KEY,
        "eventId"      INTEGER NOT NULL,
        "userId"       INTEGER NOT NULL,
        "ticketCode"   VARCHAR(50) UNIQUE NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending',
        "paymentId"    INTEGER,
        "priceInCents" INTEGER NOT NULL,
        quantity       INTEGER NOT NULL DEFAULT 1,
        "createdAt"    TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_userId  ON tickets("userId");
      CREATE INDEX IF NOT EXISTS idx_tickets_eventId ON tickets("eventId");
      CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status);
    `);
    console.log('[booking-service] DB initialisée');
  } finally {
    client.release();
  }
}

export default primaryPool;
export { replicaPool };
