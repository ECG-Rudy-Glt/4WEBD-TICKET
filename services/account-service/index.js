import app from './src/app.js';
import { initDb } from './src/db.js';

const PORT = process.env.PORT || 3003;

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Account Service démarré sur http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erreur init DB:', err);
        process.exit(1);
    });