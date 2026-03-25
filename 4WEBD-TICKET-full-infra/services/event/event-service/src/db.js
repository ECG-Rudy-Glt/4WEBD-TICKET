import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const replicaPool = new Pool({
    connectionString: process.env.DATABASE_REPLICA_URL,
});

export async function initDb() {
    await primaryPool.query(`
        CREATE TABLE IF NOT EXISTS events (
            id                  SERIAL PRIMARY KEY,
            title               VARCHAR(255) NOT NULL,
            description         TEXT,
            date                TIMESTAMPTZ NOT NULL,
            venue               VARCHAR(255) NOT NULL,
            "maxCapacity"       INTEGER NOT NULL,
            "availableTickets"  INTEGER NOT NULL,
            "priceInCents"      INTEGER NOT NULL,
            "creatorId"         INTEGER,
            status              VARCHAR(20) NOT NULL DEFAULT 'active',
            "createdAt"         TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('[event-service] DB prête');
}

export default primaryPool;
export { replicaPool };
