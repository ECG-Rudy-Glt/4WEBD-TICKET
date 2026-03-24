import pg from 'pg';
const { Pool } = pg;

const baseConfig = {
    database: process.env.DB_NAME     || 'account_service',
    user:     process.env.DB_USER     || 'account_service',
    password: process.env.DB_PASSWORD || 'account_service',
};

export const writePool = new Pool({
    ...baseConfig,
    host: process.env.DB_HOST_WRITE || 'haproxy-account-db',
    port: parseInt(process.env.DB_PORT_WRITE) || 5432,
});

const _replicaPool = new Pool({
    ...baseConfig,
    host: process.env.DB_HOST_READ || 'haproxy-account-db',
    port: parseInt(process.env.DB_PORT_READ) || 5433,
});

function isConnectionError(err) {
    return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(err.code)
        || err.message?.includes('connect')
        || err.message?.includes('Connection terminated');
}

// Tente la lecture sur le replica (port 5433), fallback sur le primary si indisponible
export const readPool = {
    query: async (text, params) => {
        try {
            return await _replicaPool.query(text, params);
        } catch (err) {
            if (isConnectionError(err)) {
                console.warn('[DB] Replica indisponible, fallback sur primary pour la lecture');
                return writePool.query(text, params);
            }
            throw err;
        }
    }
};

export async function initDb() {
    try {
        await writePool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL,
                label      VARCHAR(255) NOT NULL,
                type       VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings')),
                balance    DECIMAL(15, 2) NOT NULL DEFAULT 100,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch (err) {
        // 42P07 = relation already exists, 23505 = race condition sur pg_type
        if (err.code !== '42P07' && err.code !== '23505') throw err;
    }
    console.log('DB initialisée');
}
