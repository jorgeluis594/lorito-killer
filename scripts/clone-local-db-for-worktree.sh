#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/clone-local-db-for-worktree.sh \
    --source-env /path/to/main/.env \
    --target-env /path/to/worktree/.env \
    --feature feature-name

Creates a custom-format dump of the source local database, creates a new
database in the same local Postgres instance, restores the dump into it, and
updates only the database name inside DATABASE_URL in the target .env.
USAGE
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || die "file not found: ${path}"
}

env_value() {
  local env_file="$1"
  local key="$2"
  local line value

  line="$(grep -E "^[[:space:]]*${key}=" "${env_file}" | tail -n 1 || true)"
  [[ -n "${line}" ]] || die "${key} was not found in ${env_file}"

  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s\n' "${value}"
}

slugify_feature() {
  local feature="$1"
  local slug

  slug="$(printf '%s' "${feature}" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/_/g; s/^_+//; s/_+$//; s/_+/_/g')"

  [[ -n "${slug}" ]] || die "feature must contain at least one alphanumeric character"
  printf '%s\n' "${slug}"
}

parse_database_url() {
  local url="$1"

  if [[ ! "${url}" =~ ^postgres(ql)?://([^/?#]+)@([^/?#:]+)(:([0-9]+))?/([^?]+)(\?(.*))?$ ]]; then
    die "DATABASE_URL must look like postgresql://user:password@host:port/database"
  fi

  DB_AUTH="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[5]:-5432}"
  DB_NAME="${BASH_REMATCH[6]}"
  DB_QUERY="${BASH_REMATCH[8]:-}"

  [[ "${DB_HOST}" == "localhost" || "${DB_HOST}" == "127.0.0.1" ]] \
    || die "source DATABASE_URL must point to local Postgres, got host '${DB_HOST}'"
  [[ "${DB_PORT}" == "5432" ]] \
    || die "source DATABASE_URL must use local Postgres port 5432, got '${DB_PORT}'"
  [[ -n "${DB_NAME}" ]] || die "source DATABASE_URL is missing a database name"
}

database_url_with_db() {
  local db_name="$1"
  local url="postgresql://${DB_AUTH}@${DB_HOST}:${DB_PORT}/${db_name}"

  if [[ -n "${DB_QUERY}" ]]; then
    url="${url}?${DB_QUERY}"
  fi

  printf '%s\n' "${url}"
}

postgres_url() {
  database_url_with_db "postgres"
}

run_pg() {
  if docker compose ps postgres >/dev/null 2>&1; then
    docker compose exec -T postgres "$@"
  else
    command -v "$1" >/dev/null 2>&1 || die "docker compose postgres is unavailable and '$1' was not found locally"
    "$@"
  fi
}

update_target_env_database_url() {
  local target_env="$1"
  local dest_db="$2"
  local tmp_file

  tmp_file="$(mktemp "${target_env}.XXXXXX")"
  awk -v dest_db="${dest_db}" '
    BEGIN { updated = 0 }
    /^[[:space:]]*DATABASE_URL=/ {
      prefix = substr($0, 1, index($0, "="))
      value = substr($0, index($0, "=") + 1)
      quote = ""
      if (value ~ /^"/ && value ~ /"$/) {
        quote = "\""
        value = substr(value, 2, length(value) - 2)
      } else if (value ~ /^'\''/ && value ~ /'\''$/) {
        quote = "'\''"
        value = substr(value, 2, length(value) - 2)
      }

      query = ""
      query_start = index(value, "?")
      if (query_start > 0) {
        query = substr(value, query_start)
        value = substr(value, 1, query_start - 1)
      }

      slash = 0
      for (i = length(value); i > 0; i--) {
        if (substr(value, i, 1) == "/") {
          slash = i
          break
        }
      }

      if (slash == 0) {
        print $0
        next
      }

      print prefix quote substr(value, 1, slash) dest_db query quote
      updated = 1
      next
    }
    { print }
    END {
      if (updated == 0) {
        exit 42
      }
    }
  ' "${target_env}" > "${tmp_file}" || {
    local status=$?
    rm -f "${tmp_file}"
    if [[ "${status}" -eq 42 ]]; then
      die "DATABASE_URL was not found in ${target_env}"
    fi
    exit "${status}"
  }

  mv "${tmp_file}" "${target_env}"
}

SOURCE_ENV=""
TARGET_ENV=""
FEATURE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-env)
      SOURCE_ENV="${2:-}"
      shift 2
      ;;
    --target-env)
      TARGET_ENV="${2:-}"
      shift 2
      ;;
    --feature)
      FEATURE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "${SOURCE_ENV}" ]] || die "--source-env is required"
[[ -n "${TARGET_ENV}" ]] || die "--target-env is required"
[[ -n "${FEATURE}" ]] || die "--feature is required"

require_file "${SOURCE_ENV}"
require_file "${TARGET_ENV}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
SOURCE_DATABASE_URL="$(env_value "${SOURCE_ENV}" "DATABASE_URL")"
FEATURE_SLUG="$(slugify_feature "${FEATURE}")"
DEST_DB="lorito_killer_${FEATURE_SLUG}_development"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

parse_database_url "${SOURCE_DATABASE_URL}"

SOURCE_DB="${DB_NAME}"
SOURCE_URL="$(database_url_with_db "${SOURCE_DB}")"
DEST_URL="$(database_url_with_db "${DEST_DB}")"
MAINT_URL="$(postgres_url)"
DUMP_FILE="loritokiller_original_${SOURCE_DB}_${TIMESTAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_FILE}"

mkdir -p "${BACKUP_DIR}"

if [[ -e "${DUMP_PATH}" ]]; then
  die "dump path already exists: ${DUMP_PATH}"
fi

if [[ "$(run_pg psql "${MAINT_URL}" -tAc "SELECT 1 FROM pg_database WHERE datname = '${DEST_DB}'")" == "1" ]]; then
  die "destination database already exists: ${DEST_DB}"
fi

echo "Creating dump from ${SOURCE_DB}..."
run_pg pg_dump "${SOURCE_URL}" -Fc --blobs --no-owner --no-acl > "${DUMP_PATH}"

echo "Creating destination database ${DEST_DB}..."
run_pg psql "${MAINT_URL}" -c "CREATE DATABASE \"${DEST_DB}\""

echo "Restoring dump into ${DEST_DB}..."
run_pg pg_restore --no-owner --no-acl -d "${DEST_URL}" < "${DUMP_PATH}"

update_target_env_database_url "${TARGET_ENV}" "${DEST_DB}"

echo
echo "Worktree database cloned:"
echo "  dump: ${DUMP_PATH}"
echo "  source database: ${SOURCE_DB}"
echo "  destination database: ${DEST_DB}"
echo "  env updated: ${TARGET_ENV}"
