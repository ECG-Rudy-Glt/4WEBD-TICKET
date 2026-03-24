#!/bin/sh
set -e

until pg_isready -h user-db -p 5432 -U $POSTGRES_USER; do
  echo "En attente du primary user-db ..."
  sleep 2
done

if [ ! -f "$PGDATA/pg_VERSION" ]; then
  echo "Initialisation du replica depuis user-db..."
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  gosu postgres pg_basebackup -h user-db -D "$PGDATA" -U replicator -Fp -Xs -P -R
fi

exec gosu postgres postgres
