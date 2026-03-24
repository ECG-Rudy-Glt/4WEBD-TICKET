import app from './src/app.js';

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Auth Service démarré sur http://localhost:${PORT}`);
});
