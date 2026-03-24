#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_PORT="${FACTORY_STATION_PORT:-8791}"

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

pick_port() {
  local candidate="$1"
  while port_in_use "$candidate"; do
    candidate=$((candidate + 1))
  done
  echo "$candidate"
}

SELECTED_PORT="$(pick_port "$DEFAULT_PORT")"
if [[ "$SELECTED_PORT" != "$DEFAULT_PORT" ]]; then
  echo "[factory-station] port $DEFAULT_PORT is busy; using $SELECTED_PORT instead."
fi

if [[ ! -d node_modules ]]; then
  echo "[factory-station] installing dependencies..."
  npm install
fi

export FACTORY_STATION_PORT="$SELECTED_PORT"

echo "[factory-station] open http://127.0.0.1:${FACTORY_STATION_PORT}"
npm run dev
