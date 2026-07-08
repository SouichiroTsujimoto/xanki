#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_DESKTOP=false
WITH_SMOKE=false
SKIP_SETUP=false

for arg in "$@"; do
  case "$arg" in
    --desktop) WITH_DESKTOP=true ;;
    --smoke) WITH_SMOKE=true ;;
    --skip-setup) SKIP_SETUP=true ;;
    -h|--help)
      echo "Usage: scripts/dev-cloud.sh [--desktop] [--smoke] [--skip-setup]"
      echo ""
      echo "  --desktop     wrangler 起動後に Tauri デスクトップも起動"
      echo "  --smoke       起動待ち後に pnpm smoke:cloud (Vitest) を実行"
      echo "  --skip-setup  setup-cloud.sh をスキップ"
      exit 0
      ;;
  esac
done

if [[ "$SKIP_SETUP" != true ]]; then
  bash "$ROOT/scripts/setup-cloud.sh"
fi

echo ""
echo "==> starting vite dev (Cloudflare plugin) on http://localhost:8787"
cd "$ROOT/web"
bash "$ROOT/scripts/with-dev-secrets.sh" pnpm exec vite dev --port 8787 &
WEB_PID=$!

cleanup() {
  kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT"
node scripts/wait-health.mjs http://localhost:8787/api/health 90

echo ""
echo "Cloud dev ready:"
echo "  Web UI  : http://localhost:8787"
echo "  API     : http://localhost:8787/api/health"
echo "  OTP     : wrangler ログの [dev OTP]（メール不要）"
echo ""

if [[ "$WITH_SMOKE" == true ]]; then
  pnpm smoke:cloud
  echo ""
fi

if [[ "$WITH_DESKTOP" == true ]]; then
  echo "==> starting Tauri desktop (VITE_CLOUD_URL=http://localhost:8787)"
  cd "$ROOT/xanki"
  VITE_CLOUD_URL=http://localhost:8787 pnpm tauri dev
else
  echo "Desktop: pnpm dev:desktop  （別ターミナル）"
  echo "Smoke  : pnpm smoke:cloud"
  echo ""
  echo "Press Ctrl+C to stop vite dev."
  wait "$WEB_PID"
fi
