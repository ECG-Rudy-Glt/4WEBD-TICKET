import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://notif_user:notif_pass@notif-db:5432/notif_db',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL,
      type        VARCHAR(50) NOT NULL,
      recipient   VARCHAR(255),
      body        TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[notification-service] DB ready');
}

export default pool;
