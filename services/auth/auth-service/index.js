import app from './src/app.js';
import { initDb } from './src/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Auth Service démarré sur http://localhost:${PORT}`);
    });
}

start();
