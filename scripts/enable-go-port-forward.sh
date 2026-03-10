#!/usr/bin/env bash
set -euo pipefail

# Enable port forwarding from 80 -> 3000 on localhost (macOS only).
# Intended for use as a login item.

if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script is macOS-only." >&2
  exit 1
fi

RULE="rdr pass on lo0 inet proto tcp from any to any port 80 -> 127.0.0.1 port 3000"

# If the rule already appears in the current NAT table, do nothing.
if sudo pfctl -s nat | grep -qF "$RULE"; then
  echo "Port forwarding rule already active."
  exit 0
fi

# Load the rule via a temporary file.
TMP=$(mktemp)
cat > "$TMP" <<EOF
nat on lo0 from any to any port 80 -> 127.0.0.1 port 3000
EOF

sudo pfctl -ef "$TMP"
rm -f "$TMP"

echo "Port forwarding enabled: http://go/ -> http://go:3000/"
