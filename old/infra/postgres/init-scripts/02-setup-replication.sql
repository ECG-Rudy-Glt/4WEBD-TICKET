-- Configuration de la réplication PostgreSQL
-- Ce script est exécuté après 01-init-databases.sql

-- Créer le rôle de réplication
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_pass';

-- Note : wal_level, max_wal_senders et hot_standby
-- sont configurés dans postgresql.conf via les scripts shell
-- des dossiers db/ de chaque service.
