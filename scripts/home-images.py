#!/usr/bin/env python3
"""
WebP variants of the homepage's own photographs, in public/images/home/.

Image optimisation is off in next.config.ts (media comes pre-sized from the
API's CDN), so photographs that ship with the site are sized here instead:
the hero gets a srcset of three widths, section cards one width each.

    python3 scripts/home-images.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images", "home")

# name -> (source, widths)
IMAGES = {
    # Hero slides: full-bleed, so a srcset.
    "hero-living": ("public/images/hero-living.jpg", [768, 1280, 1920]),
    "hero-wood": ("public/images/hero-floor.jpg", [768, 1280, 1920]),
    "hero-hotel": ("public/images/project-hotel.jpg", [768, 1280, 1600]),
    "hero-visualizer-before": ("public/rooms/scandi-lounge/photo.webp", [768, 1280, 1920]),
    "hero-visualizer-after": ("scripts/rooms/scandi-lounge-honey-oak.webp", [768, 1280, 1920]),
    # Section cards and backdrops: one size each, about twice their slot.
    "space-living": ("public/rooms/loft-lounge/photo.webp", [720]),
    "space-kitchen": ("public/images/collection-spc.jpg", [720]),
    "space-office": ("public/images/project-office.jpg", [720]),
    "space-hotel": ("public/images/collection-stone.jpg", [720]),
    "space-materials": ("public/images/materials-strip.jpg", [720]),
    "closing-residence": ("public/images/project-residence.jpg", [1280]),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (source, widths) in IMAGES.items():
        image = Image.open(os.path.join(ROOT, source)).convert("RGB")
        for width in widths:
            width = min(width, image.width)
            height = round(image.height * width / image.width)
            path = os.path.join(OUT, f"{name}-{width}.webp")
            image.resize((width, height), Image.LANCZOS).save(path, "WEBP", quality=74, method=6)
            print(f"{os.path.relpath(path, ROOT)}  {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main()
