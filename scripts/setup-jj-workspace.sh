#!/usr/bin/env bash
# Bootstrap a jj workspace. See docs/dev-jj.md and @jj-workspace skill.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LITE=false

usage() {
  cat >&2 <<EOF
Usage: scripts/setup-jj-workspace.sh [--lite] [workspace-path]

  Default: install + build:shared + materialize:dev-vars + setup:cloud + .git pointer
  --lite:  install + build:shared + .git pointer only (secondary workspaces)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lite) LITE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) ROOT="$(cd "$1" && pwd)"; shift ;;
  esac
done

cd "$ROOT"
if [[ "$LITE" == true ]]; then
  echo "==> setup-jj-workspace (lite): $ROOT"
else
  echo "==> setup-jj-workspace: $ROOT"
fi

pnpm install
pnpm build:shared

if [[ "$LITE" != true ]]; then
  bash "$SCRIPT_DIR/materialize-dev-vars.sh" --root "$ROOT" --prefer-root-copy
  pnpm setup:cloud
fi

DEFAULT_ROOT=""
if command -v jj >/dev/null 2>&1; then
  DEFAULT_ROOT="$(jj workspace root --name default 2>/dev/null || true)"
fi

if [[ -n "$DEFAULT_ROOT" && "$ROOT" != "$DEFAULT_ROOT" ]]; then
  GIT_DIR="$DEFAULT_ROOT/.git"
  if [[ -d "$GIT_DIR" ]]; then
    printf 'gitdir: %s\n' "$GIT_DIR" >"$ROOT/.git"
    echo "==> setup-jj-workspace: wrote .git pointer -> $GIT_DIR"
  fi
fi

echo "==> setup-jj-workspace: done"
