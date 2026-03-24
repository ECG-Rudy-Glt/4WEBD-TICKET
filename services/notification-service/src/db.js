import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://notif_user:notif_pass@localhost:5432/notif_db',
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await primaryPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          SERIAL PRIMARY KEY,
        "userId"    INTEGER NOT NULL,
        type        VARCHAR(50) NOT NULL,
        channel     VARCHAR(20) NOT NULL DEFAULT 'email',
        recipient   VARCHAR(255),
        subject     VARCHAR(255),
        body        TEXT,
        status      VARCHAR(20) NOT NULL DEFAULT 'sent',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notif_userId ON notifications("userId");
      CREATE INDEX IF NOT EXISTS idx_notif_type   ON notifications(type);
    `);
    console.log('[notification-service] DB initialisée');
  } finally {
    client.release();
  }
}

export default primaryPool;
export { replicaPool };
