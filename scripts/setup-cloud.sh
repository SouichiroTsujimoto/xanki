#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> pnpm install"
pnpm install

echo "==> build @xanki/shared"
pnpm --filter @xanki/shared build

echo "==> D1 migrate (local)"
CI=1 pnpm --filter @xanki/web db:migrate:local

echo "==> build Web SPA"
pnpm --filter @xanki/web build:client

echo ""
echo "Setup complete."
echo "  Web API + SPA : pnpm dev:cloud"
echo "  + Desktop     : pnpm dev:cloud:all"
echo "  Smoke test    : pnpm smoke:cloud"
