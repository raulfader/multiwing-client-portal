#!/usr/bin/env bash
# Stable launcher for MCP hosts (Grok Bot, etc.): `bash /abs/path/mcp-server/run.sh`.
# stdout is reserved for MCP JSON-RPC, so every message here goes to stderr.
# Config: host-injected env wins; anything missing is read from mcp-server/.env
# (or MULTIWING_ENV_FILE) by the server itself, so no `source` is needed here.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="${MULTIWING_NODE:-node}"

if ! command -v "$NODE" >/dev/null 2>&1; then
  echo "[multiwing-mcp] '$NODE' not found on PATH (set MULTIWING_NODE to an absolute node >= 20.3 path)." >&2
  exit 127
fi
if [ ! -f "$DIR/dist/index.js" ] || [ ! -d "$DIR/node_modules" ]; then
  echo "[multiwing-mcp] Not built. Run: cd '$DIR' && pnpm install && pnpm build" >&2
  exit 1
fi

exec "$NODE" "$DIR/dist/index.js" "$@"
