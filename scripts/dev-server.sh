#!/usr/bin/env bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PostgreSQL server binaries (for local fallback if needed)
for _pgbin in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin; do
  [ -d "$_pgbin" ] && PATH="$_pgbin:$PATH"
done
export PATH

# 1. Start local PostgreSQL only if no external DATABASE_URL or if local 5432 is configured
if [[ "$DATABASE_URL" == *"5432"* && "$DATABASE_URL" == *"127.0.0.1"* ]] || [ -z "$DATABASE_URL" ]; then
  if command -v pg_isready >/dev/null 2>&1 && ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "[dev] Starting local PostgreSQL database..."
    id -u shelina >/dev/null 2>&1 || useradd -m -s /bin/bash shelina 2>/dev/null || true
    chown -R shelina:shelina "$ROOT/pgdata" "$ROOT/pgrun" "$ROOT/shelina-api" 2>/dev/null || true
    (su -s /bin/bash shelina -c "cd '$ROOT' && bash ./restore-db.sh") 2>/dev/null || true
  fi
fi

# 2. Restart Shelina API backend on port 4000
fuser -k 4000/tcp 2>/dev/null || pkill -f "shelina-api/src/server.ts" 2>/dev/null || true
echo "[dev] Starting Shelina backend API on port 4000..."
(cd "$ROOT/shelina-api" && PORT=4000 "$ROOT/shelina-api/node_modules/.bin/tsx" "$ROOT/shelina-api/src/server.ts") &

for _ in {1..50}; do
  if curl -s -m 1 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "[dev] Shelina API backend is ready on port 4000."
    break
  fi
  sleep 0.2
done

# 3. Start Vite frontend on port 3000
echo "[dev] Starting Vite frontend on port 3000..."
exec ./node_modules/.bin/vite --host 0.0.0.0 --port 3000 "$@"
