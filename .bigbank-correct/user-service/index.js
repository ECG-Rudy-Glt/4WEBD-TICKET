import app from './src/app.js';

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    console.log(`User Service démarré sur http://localhost:${PORT}`);
});