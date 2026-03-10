#!/usr/bin/env bash
set -euo pipefail

# Disable all pf rules (restores default pf state).
# WARNING: This will remove any other pf rules you may have configured.

if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script is macOS-only." >&2
  exit 1
fi

sudo pfctl -F all
sudo pfctl -e

echo "Port forwarding disabled (pf rules cleared)."
