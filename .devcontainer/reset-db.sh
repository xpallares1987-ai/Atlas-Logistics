#!/usr/bin/env bash
# Resets the Atlas Logistics SQLite database to a clean migrated state.
# Operates natively in SQLite WAL mode for local developer machines and DevContainers.

set -e

DB_FILE="${DATABASE_PATH:-data/dev.db}"

echo "⚠️  Resetting Atlas Logistics SQLite database at $DB_FILE..."
rm -f "$DB_FILE" "${DB_FILE}-wal" "${DB_FILE}-shm"
mkdir -p "$(dirname "$DB_FILE")"

echo "📄 Running Drizzle migrations..."
pnpm run db:migrate

if [ "$1" = "--seed" ] || [ "$1" = "-s" ]; then
  echo "🌱 Seeding canonical database records..."
  pnpm run db:seed
fi

echo "✅ Database reset complete."
