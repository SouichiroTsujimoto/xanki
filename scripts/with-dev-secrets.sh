#!/usr/bin/env bash
# Dev secrets loader: materialized .dev.vars preferred, then op run, then fallback.
# Materialize: pnpm materialize:dev-vars (or worktree setup). See docs/dev-cloud.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_VARS_OP="$ROOT/web/.dev.vars.op"
DEV_VARS="$ROOT/web/.dev.vars"

if [[ $# -eq 0 ]]; then
  echo "Usage: scripts/with-dev-secrets.sh <command> [args...]" >&2
  exit 1
fi

print_setup_help() {
  cat >&2 <<EOF
Dev secrets are missing. Set up 1Password CLI:

  1. brew install 1password-cli
  2. op signin
  3. Create a 1Password item (e.g. "xanki-dev") with dev secret fields
  4. Edit web/.dev.vars.op — set op:// references to your vault/item/fields
  5. pnpm materialize:dev-vars   # writes web/.dev.vars (worktree でも 1 回)
  6. pnpm check:secrets

See docs/dev-cloud.md for details.

Fallback (no 1Password): cp web/.dev.vars.example web/.dev.vars and fill in values.
EOF
}

# Materialized file: wrangler reads web/.dev.vars; no op session per dev:cloud.
if [[ -f "$DEV_VARS" ]]; then
  exec "$@"
fi

if [[ -f "$DEV_VARS_OP" ]]; then
  if command -v op >/dev/null 2>&1 && op whoami >/dev/null 2>&1; then
    exec op run --no-masking --env-file="$DEV_VARS_OP" -- "$@"
  fi
  if ! command -v op >/dev/null 2>&1; then
    echo "error: web/.dev.vars.op exists but 1Password CLI (op) is not installed." >&2
    echo "  brew install 1password-cli" >&2
    exit 1
  fi
  echo "error: 1Password CLI is not signed in. Run: op signin" >&2
  echo "  Or: pnpm materialize:dev-vars  (after op signin once)" >&2
  exit 1
fi

print_setup_help
exit 1
