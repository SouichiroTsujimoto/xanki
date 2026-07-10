#!/usr/bin/env bash
# Hand off a secondary jj workspace to default (rebase integrate) and remove it.
# See @jj-workspace-close skill and docs/dev-jj.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAME=""

usage() {
  cat >&2 <<EOF
Usage: scripts/close-jj-workspace.sh --name <workspace-name>

  Run from the default workspace. Rebases the secondary workspace's @ change onto
  default's current @ (when default has WIP), then checks out the secondary change
  on default. If default @ has no file changes, skips rebase and only checks out
  the secondary change.

  Example:
    bash scripts/close-jj-workspace.sh --name feat-flashcard-round
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$NAME" ]]; then
  echo "error: --name is required" >&2
  usage
  exit 1
fi

if ! command -v jj >/dev/null 2>&1; then
  echo "error: jj is not installed" >&2
  exit 1
fi

cd "$DEFAULT_ROOT"

CURRENT_DEFAULT="$(jj workspace root --name default 2>/dev/null || true)"
if [[ -z "$CURRENT_DEFAULT" ]]; then
  echo "error: could not resolve default workspace" >&2
  exit 1
fi

if [[ "$(pwd)" != "$CURRENT_DEFAULT" ]]; then
  echo "error: run from default workspace ($CURRENT_DEFAULT), not $(pwd)" >&2
  exit 1
fi

WS_PATH="$(jj workspace root --name "$NAME" 2>/dev/null || true)"
if [[ -z "$WS_PATH" ]]; then
  echo "error: workspace '$NAME' not found (jj workspace list)" >&2
  exit 1
fi

DEFAULT_CHANGE="$(jj log -r '@' --no-graph -T change_id)"
SECONDARY_CHANGE="$(jj -R "$WS_PATH" log -r '@' --no-graph -T change_id)"
SECONDARY_DESC="$(jj -R "$WS_PATH" log -r '@' --no-graph -T 'description.first_line()')"

if [[ -z "$DEFAULT_CHANGE" || -z "$SECONDARY_CHANGE" ]]; then
  echo "error: could not read change ids (default=$DEFAULT_CHANGE secondary=$SECONDARY_CHANGE)" >&2
  exit 1
fi

if [[ "$DEFAULT_CHANGE" == "$SECONDARY_CHANGE" ]]; then
  echo "error: default and secondary point to the same change ($DEFAULT_CHANGE)" >&2
  exit 1
fi

DEFAULT_STATUS="$(jj st 2>&1)"
DEFAULT_EMPTY=false
if [[ "$DEFAULT_STATUS" == *"The working copy has no changes."* ]]; then
  DEFAULT_EMPTY=true
fi

echo "==> close-jj-workspace: $NAME"
echo "    secondary path: $WS_PATH"
echo "    default change: $DEFAULT_CHANGE"
echo "    secondary change: $SECONDARY_CHANGE"
echo "    secondary description: ${SECONDARY_DESC:-(empty)}"
echo "    default has WIP: $([[ "$DEFAULT_EMPTY" == true ]] && echo no || echo yes)"

jj workspace forget "$NAME"
rm -rf "$WS_PATH"
echo "==> close-jj-workspace: forgot workspace and removed $WS_PATH"

if [[ "$DEFAULT_EMPTY" == true ]]; then
  echo "==> close-jj-workspace: default @ is empty — checkout secondary only"
  jj edit "$SECONDARY_CHANGE"
else
  echo "==> close-jj-workspace: rebasing secondary onto default @"
  jj rebase -r "$SECONDARY_CHANGE" -o "$DEFAULT_CHANGE"
  INTEGRATED_STATUS="$(jj st 2>&1)"
  if [[ "$INTEGRATED_STATUS" == *conflict* || "$INTEGRATED_STATUS" == *Conflict* ]]; then
    echo "error: rebase produced conflicts — resolve in the working copy, then jj describe" >&2
    echo "$INTEGRATED_STATUS" >&2
    jj edit "$SECONDARY_CHANGE" 2>/dev/null || true
    exit 1
  fi
  jj edit "$SECONDARY_CHANGE"
fi

echo "==> close-jj-workspace: default @ now at $SECONDARY_CHANGE (integrated)"
jj st
