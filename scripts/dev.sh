#!/bin/zsh
set -euo pipefail

# Port can be overridden: PORT=4000 npm run dev:safe
PORT=${PORT:-3001}

cleanup() {
  echo "Shutting down dev server on port $PORT..."
  # Ensure no leftover listener remains on the port
  for pid in $(lsof -ti tcp:"$PORT" 2>/dev/null || true); do
    local pgid
    pgid=$(ps -o pgid= -p "$pid" | tr -d ' ')
    kill -TERM -$pgid 2>/dev/null || true
    sleep 1
    kill -KILL -$pgid 2>/dev/null || true
  done
}

trap cleanup EXIT HUP INT TERM

NEXT_CMD="./node_modules/.bin/next"
if [ ! -x "$NEXT_CMD" ]; then
  NEXT_CMD="next"
fi

# Pre-kill any stale process(es) holding the port
for pid in $(lsof -ti tcp:"$PORT" 2>/dev/null || true); do
  echo "Found existing process on port $PORT: $pid. Terminating..."
  pgid=$(ps -o pgid= -p "$pid" | tr -d ' ')
  kill -TERM -$pgid 2>/dev/null || true
  sleep 1
  kill -KILL -$pgid 2>/dev/null || true
done

echo "Starting Next.js dev server on port $PORT (foreground)..."
"$NEXT_CMD" dev -p "$PORT"


