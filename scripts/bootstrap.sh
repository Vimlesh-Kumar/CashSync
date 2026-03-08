#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Starting Postgres + Redis"
docker compose up -d db redis

echo "[2/4] Installing backend dependencies + generating Prisma client"
cd backend
npm install
npm run prisma:generate

echo "[3/4] Applying SQL migration baseline"
# Prisma schema engine has intermittent issues on Node 25 in some environments.
# Fallback: apply generated SQL directly when migrate deploy is unavailable.
TABLE_EXISTS="$(docker compose exec -T db psql -U postgres -d cashsync -tAc "SELECT to_regclass('public.users') IS NOT NULL;")"
if [[ "$TABLE_EXISTS" != "t" ]]; then
  docker compose exec -T db psql \
    -U postgres \
    -d cashsync \
    -v ON_ERROR_STOP=1 \
    -f /dev/stdin < prisma/migrations/202603080001_cashsync_foundation/migration.sql
else
  echo "Schema already present, skipping SQL baseline apply"
fi
npm run prisma:seed

cd "$ROOT_DIR"

echo "[4/4] Installing frontend dependencies"
cd frontend
npm install

echo "Bootstrap complete. Run: npm run dev"
