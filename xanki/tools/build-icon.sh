#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$DIR/tools/.venv"

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r "$DIR/tools/requirements.txt"
fi

"$VENV/bin/python" "$DIR/tools/build-icon.py"
cd "$DIR"
pnpm tauri icon src-tauri/app-icon.png -o src-tauri/icons
