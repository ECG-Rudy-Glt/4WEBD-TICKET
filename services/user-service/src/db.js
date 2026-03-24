import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user_user:user_pass@localhost:5432/user_db',
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await primaryPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id          SERIAL PRIMARY KEY,
        "authId"    INTEGER UNIQUE NOT NULL,
        firstname   VARCHAR(100) NOT NULL,
        lastname    VARCHAR(100) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        phone       VARCHAR(20),
        avatar      VARCHAR(500),
        bio         TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[user-service] DB initialisée');
  } finally {
    client.release();
  }
}

export default primaryPool;
export { replicaPool };
