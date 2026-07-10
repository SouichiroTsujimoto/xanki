#!/usr/bin/env bash
# Start Mobile Vite (live reload) and launch the iOS Simulator via Capacitor.
# Cloud API is expected separately (pnpm dev:cloud) unless invoked from dev-cloud.sh --mobile.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLED=false
NO_RUN=false
SKIP_VITE=false

for arg in "$@"; do
  case "$arg" in
    --bundled) BUNDLED=true ;;
    --no-run) NO_RUN=true ;;
    --skip-vite) SKIP_VITE=true ;;
    -h|--help)
      echo "Usage: scripts/dev-ios.sh [--bundled] [--no-run] [--skip-vite]"
      echo ""
      echo "  (default)     Mobile Vite :5174 + cap sync with live reload + cap run ios"
      echo "  --bundled     dist 同梱（live reload なし、従来 cap:ios 相当）"
      echo "  --no-run      sync のみ（シミュレータ起動なし）"
      echo "  --skip-vite   Vite を起動しない（既に dev:mobile が動いているとき）"
      exit 0
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: iOS development requires macOS" >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "error: xcodebuild not found (install Xcode)" >&2
  exit 1
fi

if [[ ! -d "$ROOT/mobile/ios" ]]; then
  echo "error: mobile/ios not found" >&2
  exit 1
fi

export VITE_CLOUD_URL="${VITE_CLOUD_URL:-http://localhost:8787}"
MOBILE_VITE_URL="${CAPACITOR_DEV_SERVER_URL:-http://localhost:5174}"
VITE_PID=""

cleanup() {
  if [[ -n "$VITE_PID" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

start_vite() {
  echo "==> starting Mobile Vite on ${MOBILE_VITE_URL}"
  cd "$ROOT"
  pnpm --filter @xanki/mobile dev &
  VITE_PID=$!
  node scripts/wait-health.mjs "$MOBILE_VITE_URL" 60
}

if [[ "$BUNDLED" == true ]]; then
  echo "==> bundled iOS (dist + cap sync, no live reload)"
  cd "$ROOT"
  pnpm --filter @xanki/mobile cap:sync
  if [[ "$NO_RUN" == true ]]; then
    echo "Synced. Open mobile/ios/App/App.xcworkspace in Xcode or run:"
    echo "  pnpm --filter @xanki/mobile exec cap run ios --scheme App --no-sync"
    trap - EXIT INT TERM
    exit 0
  fi
  cd "$ROOT/mobile"
  pnpm exec cap run ios --scheme App --no-sync
  trap - EXIT INT TERM
  exit 0
fi

# Live-reload path
if [[ "$SKIP_VITE" == true ]]; then
  echo "==> skipping Mobile Vite (expecting ${MOBILE_VITE_URL})"
  node scripts/wait-health.mjs "$MOBILE_VITE_URL" 15
else
  start_vite
fi

echo ""
echo "==> cap sync ios (CAPACITOR_LIVE_RELOAD=1 → ${MOBILE_VITE_URL})"
cd "$ROOT/mobile"
# Capacitor requires webDir to exist even when server.url (live reload) is set.
if [[ ! -f dist/index.html ]]; then
  echo "==> dist missing — running one-time vite build for webDir"
  pnpm build
fi
CAPACITOR_LIVE_RELOAD=1 \
  CAPACITOR_DEV_SERVER_URL="$MOBILE_VITE_URL" \
  pnpm exec cap sync ios
node scripts/ensure-auth-session-plugin.mjs

if [[ "$NO_RUN" == true ]]; then
  echo ""
  echo "Synced with live reload. Mobile Vite PID=${VITE_PID:-external}."
  echo "  Web UI (browser): ${MOBILE_VITE_URL}"
  echo "  Cloud API       : ${VITE_CLOUD_URL}"
  echo "Run simulator: pnpm --filter @xanki/mobile exec cap run ios --scheme App --no-sync"
  # Keep Vite alive if we started it
  if [[ -n "$VITE_PID" ]]; then
    echo "Press Ctrl+C to stop Mobile Vite."
    wait "$VITE_PID"
  else
    trap - EXIT INT TERM
  fi
  exit 0
fi

echo ""
echo "Mobile iOS dev ready:"
echo "  Web UI (live) : ${MOBILE_VITE_URL}"
echo "  Cloud API     : ${VITE_CLOUD_URL}  (start with pnpm dev:cloud if not already)"
echo ""

cd "$ROOT/mobile"
# cap run is long-lived until the sim session ends; keep Vite until then
pnpm exec cap run ios --scheme App --no-sync

# If cap run exits, stop Vite via trap
