
psql -U postgres -c "CREATE USER \"${DB_USER}\" WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';" \
    2>/dev/null || echo "[post_init] User '${DB_USER}' already exists"

psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";" \
    2>/dev/null || echo "[post_init] Database '${DB_NAME}' already exists"

psql -U postgres -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO \"${DB_USER}\";"

echo "[post_init] Database '${DB_NAME}' ready for user '${DB_USER}'"
