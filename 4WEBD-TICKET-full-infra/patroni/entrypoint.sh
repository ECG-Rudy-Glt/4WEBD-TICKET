set -e

mkdir -p /var/lib/postgresql/data /var/run/postgresql
chmod 0700 /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql/data /var/run/postgresql

envsubst < /etc/patroni/patroni.yml.template > /etc/patroni/patroni.yml

exec gosu postgres patroni /etc/patroni/patroni.yml
