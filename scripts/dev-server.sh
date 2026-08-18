#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PostgreSQL server binaries
for _pgbin in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin; do
  [ -d "$_pgbin" ] && PATH="$_pgbin:$PATH"
done
export PATH

# 1. Start PostgreSQL if not already running
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "[dev] Starting PostgreSQL database..."
  id -u shelina >/dev/null 2>&1 || useradd -m -s /bin/bash shelina
  chown -R shelina:shelina "$ROOT/pgdata" "$ROOT/pgrun" "$ROOT/shelina-api" 2>/dev/null || true
  su -s /bin/bash shelina -c "cd '$ROOT' && bash ./restore-db.sh"
fi

# 2. Start Shelina API backend if not already running
if ! curl -s -m 2 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
  echo "[dev] Starting Shelina backend API on port 4000..."
  (cd "$ROOT/shelina-api" && PORT=4000 "$ROOT/shelina-api/node_modules/.bin/tsx" "$ROOT/shelina-api/src/server.ts") &
  for _ in {1..30}; do
    if curl -s -m 1 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
      echo "[dev] Shelina API backend is ready on port 4000."
      break
    fi
    sleep 0.2
  done
fi

# 3. Start Vite frontend
exec vite "$@"
