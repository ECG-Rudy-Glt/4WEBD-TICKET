#!/bin/sh
set -e

until pg_isready -h db -p 5432 -U bigbank; do
  echo "En attente du primary ... "
  sleep 2
done

if [ ! -f "$PGDATA/pg_VERSION" ]; then
  echo "Initialisation du replica depuis le primary... "
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  gosu postgres pg_basebackup -h db -D "$PGDATA" -U replicator -Fp -Xs -P -R
fi

exec gosu postgres postgres