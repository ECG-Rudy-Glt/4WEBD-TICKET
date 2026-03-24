import pg from 'pg';

const { Pool } = pg;

const primaryUrl = process.env.DATABASE_URL || 'postgresql://bigbank:bigbank@localhost:5432/bigbank';
const primaryPool = new Pool({ connectionString: primaryUrl });

const replicaUrl = process.env.DATABASE_REPLICA_URL || primaryUrl;
const replicaPool = new Pool({ connectionString: replicaUrl });

export async function initDb(){
    const client = await primaryPool.connect();
    try {
        await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            "userId" INTEGER NOT NULL,
            label VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            balance DECIMAL(12,2) DEFAULT 100,
            "createdAt" TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (err) {
        if (err.code !== '23505') throw err;
        console.log('Table accounts deja existante, skip.');
    } finally {
        client.release();
    }
}

export default primaryPool;

export { replicaPool };