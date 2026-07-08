#!/usr/bin/env bash
# Dev secrets loader: 1Password (op run) preferred, .dev.vars fallback.
# See docs/dev-cloud.md and .cursor/rules/dev-secrets-1password.mdc
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
  5. pnpm check:secrets

See docs/dev-cloud.md for details.

Fallback (no 1Password): cp web/.dev.vars.example web/.dev.vars and fill in values.
EOF
}

if [[ -f "$DEV_VARS_OP" ]]; then
  if command -v op >/dev/null 2>&1 && op whoami >/dev/null 2>&1; then
    exec op run --no-masking --env-file="$DEV_VARS_OP" -- "$@"
  fi
  if [[ -f "$DEV_VARS" ]]; then
    echo "note: using web/.dev.vars (op unavailable or not signed in)" >&2
    exec "$@"
  fi
  if ! command -v op >/dev/null 2>&1; then
    echo "error: web/.dev.vars.op exists but 1Password CLI (op) is not installed." >&2
    echo "  brew install 1password-cli" >&2
    exit 1
  fi
  echo "error: 1Password CLI is not signed in. Run: op signin" >&2
  exit 1
fi

if [[ -f "$DEV_VARS" ]]; then
  exec "$@"
fi

print_setup_help
exit 1
