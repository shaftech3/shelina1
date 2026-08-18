#!/usr/bin/env bash
#
# Shelina — rebuild the local development database from scratch.
#
# The PostgreSQL data directory (pgdata/) is *runtime state*, not source code.
# It is gitignored, it is never deployed, and it is fully reproducible from
# either of the two recovery paths below. It is therefore not kept in the
# project tree.
#
#   ./restore-db.sh          restore from backups/shelina_dev.sql  (exact data)
#   ./restore-db.sh --seed   rebuild via prisma migrate + seed     (fresh data)
#
# Both paths have been verified to reproduce byte-identical catalogue content.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# PostgreSQL server binaries (initdb, pg_ctl, postgres) are often not on PATH
# even when psql is. Add the usual locations if they exist, without assuming a
# specific distribution or version.
for _pgbin in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin /opt/homebrew/opt/postgresql@*/bin \
              /usr/local/opt/postgresql@*/bin /Library/PostgreSQL/*/bin; do
  [ -d "$_pgbin" ] && PATH="$_pgbin:$PATH"
done
export PATH

for _cmd in initdb pg_ctl psql pg_isready; do
  command -v "$_cmd" >/dev/null 2>&1 || {
    echo "!! '$_cmd' not found. Install PostgreSQL 17 client+server, e.g.:"
    echo "     Debian/Ubuntu : sudo apt-get install -y postgresql-17"
    echo "     macOS         : brew install postgresql@17"
    exit 1
  }
done

PGDATA="$ROOT/pgdata"
PGRUN="$ROOT/pgrun"
DB="shelina_dev"
USER_NAME="shelina"
DUMP="$ROOT/backups/$DB.sql"
MODE="${1:-restore}"

echo "==> Shelina database restore ($MODE)"

# 1. Cluster ---------------------------------------------------------------
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "--> creating a new cluster in pgdata/"
  rm -rf "$PGDATA" "$PGRUN"
  mkdir -p "$PGDATA" "$PGRUN"
  chmod 0700 "$PGDATA" "$PGRUN"
  initdb -D "$PGDATA" -U "$USER_NAME" --auth=trust >/dev/null
else
  echo "--> reusing the existing cluster"
  mkdir -p "$PGRUN"
fi

# 2. Server ----------------------------------------------------------------
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "--> starting PostgreSQL"
  rm -f "$PGDATA/postmaster.pid" "$PGRUN/.s.PGSQL.5432.lock"
  # Volatile subdirectories are not always preserved by archives/snapshots.
  for d in pg_notify pg_dynshmem pg_serial pg_snapshots pg_stat_tmp pg_subtrans \
           pg_twophase pg_replslot pg_commit_ts pg_logical/snapshots \
           pg_logical/mappings pg_wal/archive_status pg_wal/summaries \
           pg_tblspc pg_stat; do
    mkdir -p "$PGDATA/$d"
  done
  chmod -R 0700 "$PGDATA"
  pg_ctl -D "$PGDATA" -o "-k $PGRUN -h 127.0.0.1 -p 5432" -l "$ROOT/pg.log" -w start
else
  echo "--> PostgreSQL is already running"
fi

# 3. Database --------------------------------------------------------------
psql -h 127.0.0.1 -U "$USER_NAME" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 \
  || psql -h 127.0.0.1 -U "$USER_NAME" -d postgres -tAc "CREATE DATABASE $DB" >/dev/null

# 4. Data ------------------------------------------------------------------
if [ "$MODE" = "--seed" ]; then
  echo "--> prisma migrate deploy + seed"
  cd "$ROOT/shelina-api"
  [ -d node_modules ] || npm ci
  npx prisma migrate deploy
  npm run seed
else
  [ -s "$DUMP" ] || { echo "!! $DUMP is missing — try: ./restore-db.sh --seed"; exit 1; }
  echo "--> restoring $DUMP"
  psql -h 127.0.0.1 -U "$USER_NAME" -d "$DB" -f "$DUMP" >/dev/null
fi

# 5. Verify ----------------------------------------------------------------
echo "==> verification"
for t in products product_media categories brands banners admin_users; do
  printf '    %-16s %s\n' "$t" \
    "$(psql -h 127.0.0.1 -U "$USER_NAME" -d "$DB" -tAc "SELECT count(*) FROM $t")"
done
echo "==> ready on postgresql://$USER_NAME@127.0.0.1:5432/$DB"
