import pg from 'pg';

const { Pool } = pg;

const primaryPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://booking_user:booking_pass@booking-db:5432/booking_db',
});

const replicaPool = new Pool({
    connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL || 'postgresql://booking_user:booking_pass@booking-db:5432/booking_db',
});

export async function initDb() {
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
    console.log('[booking-service] DB prête');
}

export default primaryPool;
export { replicaPool };
