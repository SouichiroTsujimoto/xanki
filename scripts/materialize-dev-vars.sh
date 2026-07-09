#!/usr/bin/env bash
# Resolve web/.dev.vars.op (op:// references) into web/.dev.vars for local dev.
# Run once per worktree (or after secret rotation). See docs/dev-cloud.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_VARS_OP="$ROOT/web/.dev.vars.op"
OUT="$ROOT/web/.dev.vars"
PREFER_ROOT_COPY=false

usage() {
  cat >&2 <<EOF
Usage: scripts/materialize-dev-vars.sh [--prefer-root-copy]

  Writes web/.dev.vars from web/.dev.vars.op via op read.
  Output is chmod 600 and gitignored.

  --prefer-root-copy
    If ROOT_WORKTREE_PATH/web/.dev.vars exists, copy it instead of calling op.
    Used by .cursor/worktrees.json when the main checkout already materialized.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefer-root-copy) PREFER_ROOT_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "$PREFER_ROOT_COPY" == true && -n "${ROOT_WORKTREE_PATH:-}" ]]; then
  ROOT_COPY="${ROOT_WORKTREE_PATH}/web/.dev.vars"
  if [[ -f "$ROOT_COPY" ]]; then
    cp "$ROOT_COPY" "$OUT"
    chmod 600 "$OUT"
    echo "==> materialize-dev-vars: copied from root worktree ($ROOT_COPY)"
    exit 0
  fi
fi

if [[ ! -f "$DEV_VARS_OP" ]]; then
  echo "error: $DEV_VARS_OP not found" >&2
  exit 1
fi

if ! command -v op >/dev/null 2>&1; then
  echo "error: 1Password CLI (op) is not installed (brew install 1password-cli)" >&2
  exit 1
fi

if ! op whoami >/dev/null 2>&1; then
  echo "error: op is not signed in. Run: op signin" >&2
  exit 1
fi

umask 077
: >"$OUT"

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and blank lines.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line//[[:space:]]/}" ]] && continue
  [[ "$line" != *"="* ]] && continue

  key="${line%%=*}"
  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"
  val="${line#*=}"
  val="${val#"${val%%[![:space:]]*}"}"

  if [[ "$val" == op://* ]]; then
    if ! val="$(op read "$val" 2>/dev/null)"; then
      echo "error: could not resolve $key from $val" >&2
      rm -f "$OUT"
      exit 1
    fi
  fi

  # Wrangler dotenv: quote values that contain whitespace or shell metacharacters.
  if [[ "$val" =~ [[:space:]\$\"\'\\] ]]; then
    printf '%s="%s"\n' "$key" "${val//\"/\\\"}" >>"$OUT"
  else
    printf '%s=%s\n' "$key" "$val" >>"$OUT"
  fi
done <"$DEV_VARS_OP"

chmod 600 "$OUT"
echo "==> materialize-dev-vars: wrote $OUT ($(wc -l <"$OUT" | tr -d ' ') keys)"
