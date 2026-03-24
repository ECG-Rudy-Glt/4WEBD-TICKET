import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://auth_user:auth_pass@auth-db:5432/auth_db',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      firstname VARCHAR(100) NOT NULL,
      lastname  VARCHAR(100) NOT NULL,
      email     VARCHAR(255) UNIQUE NOT NULL,
      password  VARCHAR(255) NOT NULL,
      role      VARCHAR(20) NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[auth-service] DB ready');
}

export default pool;
