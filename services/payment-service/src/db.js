import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://payment_user:payment_pass@localhost:5432/payment_db',
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await primaryPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id               SERIAL PRIMARY KEY,
        "ticketId"       INTEGER NOT NULL,
        "userId"         INTEGER NOT NULL,
        "eventId"        INTEGER NOT NULL,
        "amountInCents"  INTEGER NOT NULL,
        "cardLast4"      VARCHAR(4),
        status           VARCHAR(20) NOT NULL DEFAULT 'pending',
        "transactionRef" VARCHAR(100) UNIQUE,
        "processedAt"    TIMESTAMPTZ,
        "createdAt"      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payments_userId   ON payments("userId");
      CREATE INDEX IF NOT EXISTS idx_payments_ticketId ON payments("ticketId");
      CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);
    `);
    console.log('[payment-service] DB initialisée');
  } finally {
    client.release();
  }
}

export default primaryPool;
export { replicaPool };
