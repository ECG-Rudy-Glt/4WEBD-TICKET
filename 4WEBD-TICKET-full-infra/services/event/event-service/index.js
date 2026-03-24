import app from './src/app.js';
import { initDb } from './src/db.js';

const PORT = process.env.PORT;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Event Service démarré sur http://localhost:${PORT}`);
    });
}

start();
