#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_DESKTOP=false
WITH_MOBILE=false
WITH_SMOKE=false
SKIP_SETUP=false

for arg in "$@"; do
  case "$arg" in
    --desktop) WITH_DESKTOP=true ;;
    --mobile) WITH_MOBILE=true ;;
    --smoke) WITH_SMOKE=true ;;
    --skip-setup) SKIP_SETUP=true ;;
    -h|--help)
      echo "Usage: scripts/dev-cloud.sh [--desktop] [--mobile] [--smoke] [--skip-setup]"
      echo ""
      echo "  --desktop     Cloud 起動後に Tauri デスクトップも起動"
      echo "  --mobile      Cloud 起動後に iOS シミュレータ（live reload）も起動"
      echo "  --smoke       起動待ち後に pnpm smoke:cloud (Vitest) を実行"
      echo "  --skip-setup  setup-cloud.sh をスキップ"
      exit 0
      ;;
  esac
done

if [[ "$WITH_DESKTOP" == true && "$WITH_MOBILE" == true ]]; then
  echo "error: use either --desktop or --mobile, not both" >&2
  exit 1
fi

if [[ "$SKIP_SETUP" != true ]]; then
  bash "$ROOT/scripts/setup-cloud.sh"
fi

echo ""
echo "==> starting vite dev (Cloudflare plugin) on http://localhost:8787"
cd "$ROOT/web"
bash "$ROOT/scripts/with-dev-secrets.sh" pnpm exec vite dev --host 0.0.0.0 --port 8787 &
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
elif [[ "$WITH_MOBILE" == true ]]; then
  echo "==> starting Mobile iOS (live reload, VITE_CLOUD_URL=http://localhost:8787)"
  # dev-ios starts Mobile Vite + simulator; Cloud stays up via this trap until exit
  bash "$ROOT/scripts/dev-ios.sh"
else
  echo "Desktop: pnpm dev:desktop  （別ターミナル）"
  echo "Mobile : pnpm dev:mobile:ios  （別ターミナル・iOS シミュレータ）"
  echo "Smoke  : pnpm smoke:cloud"
  echo ""
  echo "Press Ctrl+C to stop vite dev."
  wait "$WEB_PID"
fi
