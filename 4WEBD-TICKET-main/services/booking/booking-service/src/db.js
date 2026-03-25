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
            CREATE TABLE IF NOT EXISTS tickets (
                id             SERIAL PRIMARY KEY,
                "eventId"      INTEGER NOT NULL,
                "userId"       INTEGER NOT NULL,
                "ticketCode"   VARCHAR(100) UNIQUE NOT NULL,
                status         VARCHAR(20) NOT NULL DEFAULT 'pending',
                "paymentId"    INTEGER,
                "priceInCents" INTEGER NOT NULL,
                quantity       INTEGER NOT NULL DEFAULT 1,
                "createdAt"    TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (e) {
        if (e.code !== '23505') throw e;
    }
    console.log('[booking-service] DB prête');
}

export default primaryPool;
export { replicaPool };
