/**
 * Cron Backup — Simulation de sauvegarde automatique de la base Payment
 * En production : pg_dump vers un volume ou un stockage S3
 * Ici : console.log pour démontrer le mécanisme
 */

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 heures

function runBackup() {
  const now = new Date().toISOString();
  console.log(`[cron-backup] ${now} — Lancement backup payment_db...`);
  console.log(`[cron-backup] ${now} — pg_dump -h payment-pgbouncer -p 6432 -U payment_user -d payment_db > /backups/payment_${Date.now()}.sql`);
  console.log(`[cron-backup] ${now} — Backup payment_db terminé avec succès.`);
}

// Premier backup au démarrage
runBackup();

// Puis toutes les 6 heures
setInterval(runBackup, INTERVAL_MS);

console.log('[cron-backup] Service de backup démarré. Intervalle : 6h');
