#!/usr/bin/env bash
# Verify dev secrets resolve via 1Password (or .dev.vars fallback exists).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_VARS_OP="$ROOT/web/.dev.vars.op"
DEV_VARS="$ROOT/web/.dev.vars"

REQUIRED_VARS=(
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  CF_ACCOUNT_ID
  AI_GATEWAY_TOKEN
)

check_dev_vars_file() {
  local file="$1"
  local failed=0
  for var in "${REQUIRED_VARS[@]}"; do
    if ! value="$(grep -E "^${var}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"')" || [[ -z "$value" ]]; then
      echo "FAIL: $var — missing or empty in $file" >&2
      failed=1
    else
      echo "    OK: $var"
    fi
  done
  return "$failed"
}

echo "==> checking dev secrets"

if [[ -f "$DEV_VARS" ]]; then
  echo "    source: web/.dev.vars (materialized)"
  if check_dev_vars_file "$DEV_VARS"; then
    echo "==> all required dev secrets present"
    exit 0
  fi
  exit 1
fi

if [[ -f "$DEV_VARS_OP" ]]; then
  if ! command -v op >/dev/null 2>&1; then
    echo "FAIL: web/.dev.vars.op exists but op CLI is not installed (brew install 1password-cli)" >&2
    exit 1
  fi
  if ! op whoami >/dev/null 2>&1; then
    echo "FAIL: op is not signed in. Run: op signin" >&2
    exit 1
  fi
  echo "    1Password: signed in as $(op whoami)"

  failed=0
  for var in "${REQUIRED_VARS[@]}"; do
    if ! value="$(op run --no-masking --env-file="$DEV_VARS_OP" -- printenv "$var" 2>/dev/null)" || [[ -z "$value" ]]; then
      echo "FAIL: $var — could not resolve from web/.dev.vars.op" >&2
      failed=1
    else
      echo "    OK: $var"
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    echo "" >&2
    echo "Fix op:// references in web/.dev.vars.op (1Password → Copy Secret Reference)." >&2
    exit 1
  fi

  echo "==> all required dev secrets resolved"
  exit 0
fi

echo "FAIL: neither web/.dev.vars.op nor web/.dev.vars found." >&2
echo "See docs/dev-cloud.md for setup." >&2
exit 1
