import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://payment_user:payment_pass@payment-db:5432/payment_db',
});

const replicaPool = new Pool({
    connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL || 'postgresql://payment_user:payment_pass@payment-db:5432/payment_db',
});

export async function initDb() {
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
    console.log('[payment-service] DB prête');
}

export default primaryPool;
export { replicaPool };
