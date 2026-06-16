#!/bin/sh
set -eu

: "${PAOSITRA_OWNER_PASSWORD:?PAOSITRA_OWNER_PASSWORD is required}"
: "${PAOSITRA_APP_PASSWORD:?PAOSITRA_APP_PASSWORD is required}"

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=owner_password="$PAOSITRA_OWNER_PASSWORD" \
  --set=app_password="$PAOSITRA_APP_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE paositra_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'paositra_owner')
\gexec

SELECT 'CREATE ROLE paositra_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'paositra_app')
\gexec

ALTER ROLE paositra_owner PASSWORD :'owner_password';
ALTER ROLE paositra_app PASSWORD :'app_password';
ALTER DATABASE paositra OWNER TO paositra_owner;

REVOKE CONNECT ON DATABASE paositra FROM PUBLIC;
GRANT CONNECT ON DATABASE paositra TO paositra_owner, paositra_app;
SQL
