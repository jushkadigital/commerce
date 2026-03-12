#!/usr/bin/env bash
set -eu

BUILD_FOLDER="${BUILD_FOLDER:-.medusa/server}"
WORKER_MODE="${MEDUSA_WORKER_MODE:-shared}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SETUP_STORE="${RUN_SETUP_STORE:-true}"

echo "Starting Medusa with mode: ${WORKER_MODE}"

if [ "$WORKER_MODE" = "server" ]; then
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    IS_MIGRATION=true npx medusa db:migrate
    echo "Migrations completed."
  fi

  if [ "$RUN_SETUP_STORE" = "true" ]; then
    echo "Running setup-store script..."
    # setup-store might need Redis/RabbitMQ, so we don't set IS_MIGRATION=true here blindly
    # unless we are sure. Leaving it as is to be safe.
    npx medusa exec src/scripts/setup-store.ts
    echo "setup-store completed."
  fi

  if [[ "${MEDUSA_CREATE_ADMIN_USER:-false}" == "true" ]]; then
    if [[ -z "${MEDUSA_ADMIN_EMAIL:-}" ]] || [[ -z "${MEDUSA_ADMIN_PASSWORD:-}" ]]; then
      echo "Error: MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD are required when MEDUSA_CREATE_ADMIN_USER is true" >&2
      exit 1
    fi
    CREATE_EXIT_CODE=0
    # Create user only needs DB, so we can skip Redis/RabbitMQ
    CREATE_OUTPUT=$(IS_MIGRATION=true npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>&1) || CREATE_EXIT_CODE=$?
    echo "$CREATE_OUTPUT"
    if [[ $CREATE_EXIT_CODE -ne 0 ]]; then
      if [[ $CREATE_OUTPUT != *"User"*"already exists"* ]]; then
        exit $CREATE_EXIT_CODE
      else
        echo "Admin user already exists."
      fi
    else
      echo "Admin has been created successfully."
    fi
  fi
fi

cd "${BUILD_FOLDER}" || exit 1
exec npx medusa start
