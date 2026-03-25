import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const replicaPool = new Pool({
    connectionString: process.env.DATABASE_REPLICA_URL,
});

export async function initDb() {
    try {
        await primaryPool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id               SERIAL PRIMARY KEY,
                "ticketId"       INTEGER NOT NULL,
                "userId"         INTEGER NOT NULL,
                "eventId"        INTEGER NOT NULL,
                "amountInCents"  INTEGER NOT NULL,
                status           VARCHAR(20) NOT NULL DEFAULT 'pending',
                "transactionRef" VARCHAR(100) UNIQUE,
                "processedAt"    TIMESTAMPTZ,
                "createdAt"      TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (e) {
        if (e.code !== '23505') throw e;
    }
    console.log('[payment-service] DB prête');
}

export default primaryPool;
export { replicaPool };
