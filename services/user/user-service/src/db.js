import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user_user:user_pass@user-db:5432/user_db',
});

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id          SERIAL PRIMARY KEY,
            firstname   VARCHAR(100) NOT NULL,
            lastname    VARCHAR(100) NOT NULL,
            email       VARCHAR(255) UNIQUE NOT NULL,
            phone       VARCHAR(20),
            password    VARCHAR(255) NOT NULL,
            role        VARCHAR(20) NOT NULL DEFAULT 'user',
            "createdAt" TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('[user-service] DB prête');
}

export default pool;
