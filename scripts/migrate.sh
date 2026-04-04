#!/bin/sh
# migrate.sh — Run Prisma migrations against the database.
#
# Usage:
#   ./scripts/migrate.sh
#
# This script is intended to be executed as a Coolify pre-deploy hook
# (or Kubernetes init container) so that migrations run exactly once
# per deployment, rather than on every container start. This avoids
# race conditions when scaling horizontally with multiple replicas.
#
# Requirements:
#   - DATABASE_URL must be set in the environment.
#   - The prisma CLI and schema must be available (copied during Docker build).

set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Migrations complete."
