import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id          SERIAL PRIMARY KEY,
                "userId"    INTEGER,
                type        VARCHAR(50) NOT NULL,
                recipient   VARCHAR(255),
                body        TEXT,
                "createdAt" TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (e) {
        if (e.code !== '23505') throw e;
    }
    console.log('[notification-service] DB prête');
}

export default pool;
