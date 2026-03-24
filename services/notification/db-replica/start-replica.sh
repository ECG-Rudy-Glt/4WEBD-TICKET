#!/bin/sh
set -e

until pg_isready -h ${PRIMARY_HOST} -p 5432; do
  echo "En attente du primary ${PRIMARY_HOST}..."
  sleep 2
done

if [ ! -f "$PGDATA/pg_VERSION" ]; then
  echo "Initialisation du replica depuis ${PRIMARY_HOST}..."
  rm -rf "$PGDATA"/*
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  gosu postgres pg_basebackup -h ${PRIMARY_HOST} -D "$PGDATA" -U replicator -Fp -Xs -P -R
fi

exec gosu postgres postgres
