#!/usr/bin/env bash
# Development driver for factoriollm.
#
# Doesn't reimplement headless-server bootstrapping: server lifecycle
# (setup/start/stop/rcon/sidecar/...) is forwarded to a checkout of the
# sibling factorio-broadcast project (github.com/aronbodogai/factorio-broadcast),
# pointed to by FACTORIO_BROADCAST_DIR. factoriollm's own subcommands sit on
# top of that.
#
#   export FACTORIO_BROADCAST_DIR=/mnt/c/Users/<you>/factorio-broadcast
#   ./scripts/dev.sh start          # forwarded — starts the shared dev server
#   ./scripts/dev.sh ping           # factoriollm: RCON round trip to the companion mod
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"

SIBLING_DEV_SH="${FACTORIO_BROADCAST_DIR:-}/scripts/dev.sh"

# Exactly the sibling's own subcommand list (see its scripts/dev.sh / README).
SIBLING_COMMANDS="setup softmod mod mode start stop restart wait status errors logs reset-save sidecar sidecar-stop rcon rcon-lua"

is_sibling_command() {
  local target="$1"
  for c in $SIBLING_COMMANDS; do
    [[ "$c" == "$target" ]] && return 0
  done
  return 1
}

forward_to_sibling() {
  if [[ -z "${FACTORIO_BROADCAST_DIR:-}" ]]; then
    echo "FACTORIO_BROADCAST_DIR is not set — point it at a factorio-broadcast checkout to run '$1'" >&2
    exit 1
  fi
  if [[ ! -x "$SIBLING_DEV_SH" ]]; then
    echo "not found or not executable: $SIBLING_DEV_SH" >&2
    exit 1
  fi
  exec "$SIBLING_DEV_SH" "$@"
}

cmd="${1:-}"
[[ $# -gt 0 ]] && shift

case "$cmd" in
  ping)
    (cd "$REPO_ROOT/packages/cli" && npx tsx src/index.ts ping "$@")
    ;;
  speed)
    (cd "$REPO_ROOT/packages/cli" && npx tsx src/index.ts speed "$@")
    ;;
  "")
    cat >&2 <<EOF
usage: dev.sh <command> [args]
  factoriollm commands:            ping, speed [<N>|reset]
  forwarded to factorio-broadcast: $SIBLING_COMMANDS
EOF
    exit 64
    ;;
  *)
    if is_sibling_command "$cmd"; then
      forward_to_sibling "$cmd" "$@"
    else
      echo "unknown command: $cmd" >&2
      exit 64
    fi
    ;;
esac
