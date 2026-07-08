#!/usr/bin/env bash
# Build web assets and sync to the Capacitor iOS project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm build:mobile
cd mobile
npx cap sync ios
echo "Open mobile/ios/App/App.xcworkspace in Xcode for Archive / TestFlight."
