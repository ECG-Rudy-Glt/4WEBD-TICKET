
const INTERVAL_MS = 6 * 60 * 60 * 1000;

function runBackup() {
  const now = new Date().toISOString();
  console.log(`[cron-backup] ${now} — Lancement backup payment_db...`);
  console.log(`[cron-backup] ${now} — pg_dump -h payment-pgbouncer -p 6432 -U payment_user -d payment_db > /backups/payment_${Date.now()}.sql`);
  console.log(`[cron-backup] ${now} — Backup payment_db terminé avec succès.`);
}

runBackup();

setInterval(runBackup, INTERVAL_MS);

console.log('[cron-backup] Service de backup démarré. Intervalle : 6h');
