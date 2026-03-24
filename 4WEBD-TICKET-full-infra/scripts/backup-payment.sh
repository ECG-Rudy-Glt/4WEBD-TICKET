#!/bin/sh
# Backup périodique de la base de données payment
# A lancer via docker-compose en service sidecar ou cron

BACKUP_DIR="/backups"
DB_HOST="${PAYMENT_DB_HOST:-payment-db}"
DB_USER="${PAYMENT_DB_USER:-payment_user}"
DB_NAME="${PAYMENT_DB_NAME:-payment_db}"
PGPASSWORD="${PAYMENT_DB_PASSWORD:-payment_pass}"

mkdir -p "$BACKUP_DIR"

echo "Starting backup loop (every hour)..."

while true; do
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  FILENAME="$BACKUP_DIR/payment_backup_$TIMESTAMP.sql"

  PGPASSWORD="$PGPASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$FILENAME"

  if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Backup OK : $FILENAME"
  else
    echo "[$TIMESTAMP] Backup FAILED"
  fi

  # Conserver uniquement les 48 derniers backups (48h)
  ls -t "$BACKUP_DIR"/payment_backup_*.sql | tail -n +49 | xargs -r rm

  sleep 3600
done
