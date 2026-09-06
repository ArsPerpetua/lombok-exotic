"""
Convert the brand logo PDFs in this folder to web assets under
apps/lombok-exotic/public/brand/  (logo-light.{svg,png}, logo-dark.{svg,png}).

    pip install --user pymupdf pillow numpy
    python assets/convert-logos.py      # run from the repo root

- light: red wordmark + black ornaments/tagline, transparent -> used as-is.
- dark : silver (#dcdedd) ornaments/tagline recoloured from the light source so
         the PNG stays transparent; the SVG is the vendor dark file with its
         black background rectangle stripped.
"""

import os
import re

import numpy as np
import pymupdf
from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "apps", "lombok-exotic", "public", "brand")
PAD = 8.0
TARGET_W = 1600
SILVER = (220, 222, 221)  # #dcdedd


def crop_rect(page):
    r = pymupdf.Rect()
    for dr in page.get_drawings():
        if dr["rect"].width > 590 and dr["rect"].height > 590:
            continue  # skip the full-canvas background box
        r |= dr["rect"]
    for b in page.get_text("dict")["blocks"]:
        r |= pymupdf.Rect(b["bbox"])
    return pymupdf.Rect(r.x0 - PAD, r.y0 - PAD, r.x1 + PAD, r.y1 + PAD) & page.rect


def render_png(pdf, recolor_dark=False):
    page = pymupdf.open(pdf)[0]
    cr = crop_rect(page)
    page.set_cropbox(cr)
    scale = TARGET_W / cr.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=True)
    img = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)
    if not recolor_dark:
        return img
    a = np.array(img)
    R, G, B = (a[:, :, i].astype(np.int16) for i in range(3))
    is_red = (R > 110) & (R > G + 40) & (R > B + 40)
    darkness = 1.0 - (np.maximum(np.maximum(R, G), B) / 255.0)
    mask = (~is_red) & (a[:, :, 3] > 0)
    for i, ch in enumerate(SILVER):
        chan = a[:, :, i].astype(np.float32)
        chan[mask] = ch * darkness[mask] + chan[mask] * (1 - darkness[mask])
        a[:, :, i] = np.clip(chan, 0, 255).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def make_svg(pdf, strip_bg=False):
    page = pymupdf.open(pdf)[0]
    page.set_cropbox(crop_rect(page))
    svg = page.get_svg_image(text_as_path=True)
    if strip_bg:
        svg = re.sub(
            r'<path transform="matrix\(1,0,0,-1,0,595\.2756\)" '
            r'd="M0 595\.2756H595\.2756V0H0Z"[^/]*/>',
            "",
            svg,
        )
    return svg


def main():
    os.makedirs(OUT, exist_ok=True)
    light = os.path.join(HERE, "logo-lombok-exotic-light.pdf")
    dark = os.path.join(HERE, "logo-lombok-exotic-dark.pdf")

    render_png(light).save(os.path.join(OUT, "logo-light.png"))
    _write(os.path.join(OUT, "logo-light.svg"), make_svg(light))
    render_png(light, recolor_dark=True).save(os.path.join(OUT, "logo-dark.png"))
    _write(os.path.join(OUT, "logo-dark.svg"), make_svg(dark, strip_bg=True))
    print("wrote 4 files to", os.path.normpath(OUT))


def _write(path, text):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


if __name__ == "__main__":
    main()
