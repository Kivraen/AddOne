#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.bootstrap.yml"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--env-file path] [--compose-file path]" >&2
      exit 1
      ;;
  esac
done

if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/mosquitto/render-passwords.mjs" \
    --env-file "$ENV_FILE" \
    --output "$ROOT_DIR/mosquitto/passwords.txt"
else
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /tmp:/tmp \
    -v "$ROOT_DIR:$ROOT_DIR" \
    -w "$ROOT_DIR" \
    node:22-alpine \
    sh -lc "apk add --no-cache docker-cli >/dev/null && node \"$ROOT_DIR/mosquitto/render-passwords.mjs\" --env-file \"$ENV_FILE\" --output \"$ROOT_DIR/mosquitto/passwords.txt\""
fi

docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps mosquitto

echo "[mosquitto-sync] refreshed broker passwords using $ENV_FILE and $COMPOSE_FILE"
