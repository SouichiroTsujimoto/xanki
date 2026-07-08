#!/usr/bin/env bash
# Enforce design token usage in @xanki/ui CSS (border widths, focus outlines, no glow).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STYLES="$ROOT/packages/ui/src/styles"

echo "==> checking design tokens in packages/ui/src/styles"

failed=0
warned=0

scan_css() {
  local file="$1"
  local rel="${file#"$ROOT"/}"
  local line_num=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_num=$((line_num + 1))
    # Skip comments
    [[ "$line" =~ ^[[:space:]]*/\* ]] && continue
    [[ "$line" =~ ^[[:space:]]*\* ]] && continue

    # FAIL: hardcoded outline width (allowed only in focus.css)
    if [[ "$rel" != *"/focus.css" ]] && [[ "$line" =~ outline:[[:space:]]*[0-9]+px ]]; then
      echo "FAIL: $rel:$line_num — hardcoded outline width (use focus.css + tokens)" >&2
      echo "      $line" >&2
      failed=1
    fi

    # FAIL: hardcoded outline-offset (allowed only in focus.css)
    if [[ "$rel" != *"/focus.css" ]] && [[ "$line" =~ outline-offset:[[:space:]]*[0-9]+px ]]; then
      echo "FAIL: $rel:$line_num — hardcoded outline-offset (use focus.css + tokens)" >&2
      echo "      $line" >&2
      failed=1
    fi

    # FAIL: 1.5px borders anywhere
    if [[ "$line" =~ border:[[:space:]]*1\.5px ]]; then
      echo "FAIL: $rel:$line_num — 1.5px border not allowed (use --border-width-default or --border-width-strong)" >&2
      echo "      $line" >&2
      failed=1
    fi

    # FAIL: focus glow box-shadow (allowlist exceptions below)
    if [[ "$line" =~ box-shadow:[[:space:]]*0[[:space:]]+0[[:space:]]+0[[:space:]]+[0-9]+px ]]; then
      # autofill inset (base.css)
      if [[ "$line" =~ inset ]] && [[ "$rel" == *"/base.css" ]]; then
        :
      # mask selection halo (mask-editor.css)
      elif [[ "$line" =~ var\(--color-card\) ]] && [[ "$rel" == *"/mask-editor.css" ]]; then
        :
      else
        echo "FAIL: $rel:$line_num — box-shadow ring (focus glow forbidden; use focus.css outline)" >&2
        echo "      $line" >&2
        failed=1
      fi
    fi

    # WARN: hardcoded border width without token (border: 0 is OK)
    if [[ "$line" =~ border:[[:space:]]*[0-9]+px[[:space:]]+(solid|dashed) ]] \
      && [[ "$line" != *"var(--border-width"* ]]; then
      echo "WARN: $rel:$line_num — hardcoded border width (prefer --border-width-default / --border-width-strong)" >&2
      echo "      $line" >&2
      warned=1
    fi
  done < "$file"
}

while IFS= read -r -d '' file; do
  scan_css "$file"
done < <(find "$STYLES" -name '*.css' -print0)

if [[ "$failed" -ne 0 ]]; then
  echo "" >&2
  echo "Design token check failed. See docs/spec/ui.md §Interaction States" >&2
  exit 1
fi

if [[ "$warned" -ne 0 ]]; then
  echo "    ($warned warning(s) — consider migrating to border width tokens)"
fi

echo "    OK: design tokens"
