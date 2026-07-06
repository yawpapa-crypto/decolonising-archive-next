#!/usr/bin/env bash
set -euo pipefail

# Safe migration apply script for migration file 0024_workbench_review_extractions.sql
# Usage:
#   DATABASE_URL="postgres://..." ./scripts/apply-migration.sh
# Or using supabase CLI (preferred if configured):
#   supabase db push --file supabase/migrations/0024_workbench_review_extractions.sql

MIGRATION_FILE="supabase/migrations/0024_workbench_review_extractions.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if [ -n "${SUPABASE_URL-}" ] && command -v supabase >/dev/null 2>&1; then
  echo "Using supabase CLI to push migration (SUPABASE_URL present)."
  echo "Run: supabase db push --file $MIGRATION_FILE"
  exit 0
fi

if [ -z "${DATABASE_URL-}" ]; then
  echo "No DATABASE_URL set. Set DATABASE_URL or install/authorize supabase CLI to apply migration."
  echo "To apply locally with psql (example):"
  echo "  DATABASE_URL=\"postgres://user:pass@host:5432/dbname\" psql \"$DATABASE_URL\" -f $MIGRATION_FILE"
  exit 1
fi

echo "Applying migration $MIGRATION_FILE to DATABASE_URL"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"
echo "Migration applied."
