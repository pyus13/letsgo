#!/usr/bin/env bash
set -euo pipefail

# Run Go Links server + ensure go / port forwarding works in one command.
# This is designed for macOS (uses pfctl) and assumes the repo is the current folder.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Ensure we have npm dependencies
if [[ ! -f package.json ]]; then
  echo "ERROR: package.json not found in $ROOT." >&2
  exit 1
fi

# Ensure hosts entry exists
HOSTS_LINE="127.0.0.1 go"
if ! grep -Fxq "$HOSTS_LINE" /etc/hosts; then
  echo "Adding host entry: $HOSTS_LINE"
  sudo sh -c "echo '$HOSTS_LINE' >> /etc/hosts"
fi

# Find an available port starting at 3000
find_free_port() {
  local p=$1
  while lsof -i TCP:$p -sTCP:LISTEN -Pn >/dev/null 2>&1; do
    p=$((p + 1))
    if [[ $p -ge 3100 ]]; then
      echo "No free port found between 3000-3099" >&2
      return 1
    fi
  done
  echo $p
}

PORT=3000
if lsof -i TCP:$PORT -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "Port $PORT already in use; finding alternate port..."
  PORT=$(find_free_port $PORT)
  echo "Using port $PORT instead."
fi

# Start server (backgrounded)
if pgrep -f "node .*server\.js" >/dev/null 2>&1; then
  echo "Server already running (node server.js)."
else
  echo "Starting server on port $PORT..."
  PORT=$PORT nohup npm run dev >/dev/null 2>&1 &
  sleep 1
fi

# If macOS, enable port forwarding from 80 -> $PORT
if [[ "$(uname)" == "Darwin" ]]; then
  RULE="rdr pass on lo0 inet proto tcp from any to any port 80 -> 127.0.0.1 port $PORT"
  if ! sudo pfctl -s nat | grep -qF "$RULE"; then
    echo "Enabling port forwarding: http://go/ -> http://go:$PORT/"
    TMP=$(mktemp)
    cat > "$TMP" <<EOF
nat on lo0 from any to any port 80 -> 127.0.0.1 port $PORT
EOF
    sudo pfctl -ef "$TMP"
    rm -f "$TMP"
  else
    echo "Port forwarding already enabled (80 -> $PORT)."
  fi
fi

echo "Go Links is running."
echo "Manage links: http://localhost:$PORT"
if [[ "$(uname)" == "Darwin" ]]; then
  echo "Use: http://go/alias (or http://go:$PORT/alias)"
fi
