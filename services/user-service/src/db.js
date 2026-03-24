import pg from 'pg';
const { Pool } = pg;

const baseConfig = {
    database: process.env.DB_NAME     || 'user_service',
    user:     process.env.DB_USER     || 'user_service',
    password: process.env.DB_PASSWORD || 'user_service',
};

export const writePool = new Pool({
    ...baseConfig,
    host: process.env.DB_HOST_WRITE || 'haproxy-user-db',
    port: parseInt(process.env.DB_PORT_WRITE) || 5432,
});

const _replicaPool = new Pool({
    ...baseConfig,
    host: process.env.DB_HOST_READ || 'haproxy-user-db',
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
            CREATE TABLE IF NOT EXISTS users (
                id         SERIAL PRIMARY KEY,
                firstname  VARCHAR(255) NOT NULL,
                lastname   VARCHAR(255) NOT NULL,
                email      VARCHAR(255) NOT NULL UNIQUE,
                phone      VARCHAR(50),
                role       VARCHAR(50) NOT NULL DEFAULT 'customer',
                password   VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch (err) {
        if (err.code !== '42P07' && err.code !== '23505') throw err;
    }
    console.log('DB initialisée');
}
