#!/usr/bin/env bash
# Resolve web/.dev.vars.op (op:// references) into web/.dev.vars for local dev.
# Run once per jj workspace (or after secret rotation). See docs/dev-cloud.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_VARS_OP="$ROOT/web/.dev.vars.op"
OUT="$ROOT/web/.dev.vars"
PREFER_ROOT_COPY=false

usage() {
  cat >&2 <<EOF
Usage: scripts/materialize-dev-vars.sh [--root <path>] [--prefer-root-copy]

  Writes web/.dev.vars from web/.dev.vars.op via op read.
  Output is chmod 600 and gitignored.

  --root <path>
    Target workspace root (default: repo containing this script).

  --prefer-root-copy
    If the default jj workspace (or ROOT_WORKTREE_PATH) has web/.dev.vars,
    copy it instead of calling op.
EOF
}

resolve_root_copy_path() {
  if [[ -n "${ROOT_WORKTREE_PATH:-}" ]]; then
    echo "${ROOT_WORKTREE_PATH}/web/.dev.vars"
    return
  fi
  if command -v jj >/dev/null 2>&1; then
    local default_root
    default_root="$(jj workspace root --name default 2>/dev/null || true)"
    if [[ -n "$default_root" ]]; then
      echo "${default_root}/web/.dev.vars"
    fi
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      ROOT="$(cd "$2" && pwd)"
      DEV_VARS_OP="$ROOT/web/.dev.vars.op"
      OUT="$ROOT/web/.dev.vars"
      shift 2
      ;;
    --prefer-root-copy) PREFER_ROOT_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "$PREFER_ROOT_COPY" == true ]]; then
  ROOT_COPY="$(resolve_root_copy_path || true)"
  if [[ -n "${ROOT_COPY:-}" && -f "$ROOT_COPY" && "$ROOT_COPY" != "$OUT" ]]; then
    cp "$ROOT_COPY" "$OUT"
    chmod 600 "$OUT"
    echo "==> materialize-dev-vars: copied from default workspace ($ROOT_COPY)"
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
