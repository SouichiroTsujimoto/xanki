#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$SCRIPT_DIR/xanki-ocr"
swiftc -O -o "$OUT" "$SCRIPT_DIR/main.swift"
chmod +x "$OUT"

# Tauri externalBin expects target-triple suffix
for triple in aarch64-apple-darwin x86_64-apple-darwin; do
  cp "$OUT" "$SCRIPT_DIR/xanki-ocr-$triple"
  chmod +x "$SCRIPT_DIR/xanki-ocr-$triple"
done

echo "Built $OUT and target-triple variants"
