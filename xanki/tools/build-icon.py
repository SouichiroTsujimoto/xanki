#!/usr/bin/env python3
"""Build a macOS-compliant app icon from the shared xanki logo.

macOS Dock icons are not auto-masked at runtime; the .icns is shown as-is.
Apple's template uses a 1024x1024 canvas with ~824x824 artwork centered and a
squircle silhouette (radius ~228px). Source art that fills the entire canvas
looks oversized next to native apps, and baked corner radii rarely match the
system squircle.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

CANVAS = 1024
SQUIRCLE_RADIUS = 228
CONTENT = 824

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "packages/ui/src/assets/xanki-logo.png"
OUTPUT = ROOT / "src-tauri/app-icon.png"


def build_icon(source: Path, output: Path) -> None:
    logo = Image.open(source).convert("RGBA")
    logo = logo.resize((CONTENT, CONTENT), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    margin = (CANVAS - CONTENT) // 2
    canvas.paste(logo, (margin, margin), logo)

    mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, CANVAS - 1, CANVAS - 1),
        radius=SQUIRCLE_RADIUS,
        fill=255,
    )

    shaped = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    shaped.paste(canvas, (0, 0), mask)
    output.parent.mkdir(parents=True, exist_ok=True)
    shaped.save(output, "PNG")
    print(
        f"wrote {output} ({CANVAS}x{CANVAS}, content={CONTENT}, r={SQUIRCLE_RADIUS})"
    )


if __name__ == "__main__":
    build_icon(SOURCE, OUTPUT)
