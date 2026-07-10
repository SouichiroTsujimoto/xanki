#!/usr/bin/env bash
# Rebase the current work stack onto main, move the main bookmark, and push to origin.
# Before running: ensure @ is one coherent context (describe → jj new if needed).
# See @jj-push-main skill and docs/dev-jj.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE="origin"
REVISION="@"
DRY_RUN=0
START_NEW=1

usage() {
  cat >&2 <<EOF
Usage: scripts/push-jj-main.sh [options]

  Fetch origin, rebase the stack containing the target revision onto main, move
  main to that revision, and push main to the Git remote.

Options:
  --revision <REV>   Tip revision to publish (default: @)
  --remote <name>    Git remote (default: origin)
  --dry-run          Print the plan only (no fetch, rebase, bookmark, or push)
  --no-new           Do not run \`jj new main\` after a successful push
  -h, --help         Show this help

Example:
  bash scripts/push-jj-main.sh --dry-run
  bash scripts/push-jj-main.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --revision) REVISION="$2"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-new) START_NEW=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if ! command -v jj >/dev/null 2>&1; then
  echo "error: jj is not installed" >&2
  exit 1
fi

cd "$ROOT"

if ! jj log -r "$REVISION" --limit 1 >/dev/null 2>&1; then
  echo "error: revision not found: $REVISION" >&2
  exit 1
fi

if jj log -r "$REVISION" --limit 1 | grep -q '(conflict)'; then
  echo "error: $REVISION has unresolved conflicts — resolve before pushing to main" >&2
  exit 1
fi

STACK_ROOT="$(jj log -r "roots(::$REVISION ~ ::main)" --no-graph -T change_id --limit 1 2>/dev/null || true)"
if [[ -z "$STACK_ROOT" ]]; then
  echo "error: no commits to publish — $REVISION is already on main" >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run plan:"
  echo "  remote:      $REMOTE"
  echo "  tip:         $REVISION"
  echo "  stack root:  $STACK_ROOT"
  echo "  commits:"
  jj log -r "::$REVISION ~ ::main" --no-graph
  echo
  echo "Would run:"
  echo "  jj git fetch --remote $REMOTE"
  echo "  jj bookmark track main --remote=$REMOTE"
  echo "  jj rebase -s $STACK_ROOT -d main"
  echo "  jj bookmark set main -r $REVISION"
  echo "  jj git push --bookmark main --remote $REMOTE"
  if [[ "$START_NEW" -eq 1 ]]; then
    echo "  jj new main"
  fi
  exit 0
fi

echo "==> Fetch $REMOTE"
jj git fetch --remote "$REMOTE"

echo "==> Track main@$REMOTE (idempotent)"
jj bookmark track main --remote="$REMOTE" >/dev/null 2>&1 || true

echo "==> Rebase stack ($STACK_ROOT :: $REVISION) onto main"
jj rebase -s "$STACK_ROOT" -d main

if jj log -r "$REVISION" --limit 1 | grep -q '(conflict)'; then
  echo "error: rebase onto main produced conflicts — resolve, then retry" >&2
  exit 1
fi

echo "==> Move main bookmark to $REVISION"
jj bookmark set main -r "$REVISION"

echo "==> Push main to $REMOTE"
jj git push --bookmark main --remote "$REMOTE"

if [[ "$START_NEW" -eq 1 ]]; then
  echo "==> Start new change on main"
  jj new main
fi

echo "Done. main is on $REMOTE and @ is ready for the next change."
