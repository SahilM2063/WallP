"""Renders the app icon and splash marks: a lowercase "w" set in Figtree ExtraBold.

Run from the repo root with Pillow installed:  python scripts/generate-logo.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@expo-google-fonts/figtree/800ExtraBold/Figtree_800ExtraBold.ttf"
OUT = ROOT / "apps/mobile/assets"
INK = (11, 11, 12, 255)
PAPER = (255, 255, 255, 255)


def mark(size, glyph_width, color, background=(0, 0, 0, 0)):
    """A square canvas with the "w" centred on its ink bounds, `glyph_width` of the canvas wide."""
    image = Image.new("RGBA", (size, size), background)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT), 1000)
    left, top, right, bottom = font.getbbox("w")
    font = ImageFont.truetype(str(FONT), round(1000 * size * glyph_width / (right - left)))
    left, top, right, bottom = font.getbbox("w")
    draw.text(((size - (right - left)) / 2 - left, (size - (bottom - top)) / 2 - top), "w", font=font, fill=color)
    return image


mark(1024, 0.56, PAPER, INK).save(OUT / "icon.png")
# Android masks adaptive icons, so the glyph stays inside the centre safe zone.
mark(1024, 0.36, PAPER).save(OUT / "adaptive-icon.png")
mark(1024, 0.36, INK).save(OUT / "adaptive-icon-mono.png")
mark(512, 0.62, INK).save(OUT / "splash-icon.png")
mark(512, 0.62, PAPER).save(OUT / "splash-icon-dark.png")
print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))
