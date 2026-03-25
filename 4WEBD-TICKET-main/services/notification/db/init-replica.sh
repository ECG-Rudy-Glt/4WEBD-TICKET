#!/bin/sh
set -e

cat >> "$PGDATA/postgresql.conf" <<PGEOF
wal_level = replica
max_wal_senders = 3
hot_standby = on
PGEOF

echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator';
EOSQL
