import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://booking_user:booking_pass@booking-db:5432/booking_db',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id             SERIAL PRIMARY KEY,
      "eventId"      INTEGER NOT NULL,
      "userId"       INTEGER NOT NULL,
      "ticketCode"   VARCHAR(50) UNIQUE NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending',
      "paymentId"    INTEGER,
      "priceInCents" INTEGER NOT NULL,
      quantity       INTEGER NOT NULL DEFAULT 1,
      "createdAt"    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[booking-service] DB ready');
}

export default pool;
