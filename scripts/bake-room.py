"""Bake a template room for the visualizer: floor mask, light maps, walls, rug.

    pip install opencv-python-headless numpy pillow
    python3 scripts/bake-room.py <room-id> [source-photo]

Reads `scripts/rooms/<id>.json` and the source photo — the path given, else
`scripts/rooms/src/<id>.jpg`, else the shipped `public/rooms/<id>/photo.webp` —
and writes `public/rooms/<id>/`. Review overlays go to /tmp/review_<id>_*.jpg:
look at every one before shipping a room. Polygons are in shares of the photo
(0..1), read off `scripts/room-grid.py` views. See docs/room-visualizer.md.

Spec:
  floor: { probable: [poly...], sure: [poly...], not: [poly...] }
  walls: { probable: [poly...], sure: [poly...], not: [poly...] }   (optional)
  quad: [[x,y] x4]   far-left, far-right, near-right, near-left on the floor plane
  widthM: real width the quad's near edge spans, metres
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

WORK_WIDTH = 1280  # GrabCut resolution
OUT_WIDTH = 1920  # shipped photo width
MAP_WIDTH = 960  # shipped mask/light width (soft maps; scaled up smoothly)


def poly_px(poly, w, h):
    return np.array([[round(x * w), round(y * h)] for x, y in poly], np.int32)


def fill(mask, polys, value, w, h):
    for poly in polys or []:
        cv2.fillPoly(mask, [poly_px(poly, w, h)], value)


def grabcut(img, spec, w, h, iterations=8):
    """Probable region → GC_PR_FGD, sure seeds → GC_FGD, `not` → GC_BGD."""
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    fill(gc, spec.get("probable"), cv2.GC_PR_FGD, w, h)
    fill(gc, spec.get("maybeNot"), cv2.GC_PR_BGD, w, h)
    fill(gc, spec.get("not"), cv2.GC_BGD, w, h)
    fill(gc, spec.get("sure"), cv2.GC_FGD, w, h)
    for x1, y1, x2, y2, t in spec.get("notLines", []):
        cv2.line(gc, (round(x1 * w), round(y1 * h)), (round(x2 * w), round(y2 * h)), cv2.GC_BGD, max(1, round(t * w)))
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, None, bgd, fgd, iterations, cv2.GC_INIT_WITH_MASK)
    hard = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
    # Keep components that touch a sure seed; drop specks.
    seeds = np.zeros((h, w), np.uint8)
    fill(seeds, spec.get("sure"), 1, w, h)
    count, labels = cv2.connectedComponents((hard > 0).astype(np.uint8))
    keep = np.zeros(count, bool)
    keep[np.unique(labels[seeds > 0])] = True
    keep[0] = False
    hard = keep[labels].astype(np.float32)
    # Fill small holes (reflection speckle), not real gaps between furniture legs.
    inv = (hard == 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(inv)
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] < (w * h) * spec.get("holeShare", 0.0004):
            hard[labels == i] = 1
    return hard


def guided(guide_gray, src, radius, eps):
    """He et al. guided filter: edge-aware softening of a mask along the photo."""
    mean = lambda x: cv2.boxFilter(x, -1, (radius, radius))
    mI, mp = mean(guide_gray), mean(src)
    cov = mean(guide_gray * src) - mI * mp
    var = mean(guide_gray * guide_gray) - mI * mI
    a = cov / (var + eps)
    b = mp - a * mI
    return np.clip(mean(a) * guide_gray + mean(b), 0, 1)


def soft_edges(img, hard):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    soft = guided(gray, hard, 5, 1e-3)
    # Anti-alias without growing: never more than a pixel beyond the hard mask.
    grown = cv2.dilate(hard, np.ones((3, 3), np.uint8))
    return np.minimum(soft, grown)


def light_maps(img, floor, spec):
    """The floor's own light relative to its average, texture removed.

    shading:  min(1, L / ref) with depth kept per `shadowDepth`, grey.
    highlights: max(0, L / ref - start) / range, grey, screened by finish.
    Normalised convolution inside the floor keeps furniture out of the blur,
    then a guided filter puts shadow edges back where the photo has them.
    """
    h, w = floor.shape
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0] / 255.0
    sigma = spec.get("lightBlur", 0.012) * w
    inside = (floor > 0.5).astype(np.float32)
    num = cv2.GaussianBlur(L * inside, (0, 0), sigma)
    den = cv2.GaussianBlur(inside, (0, 0), sigma)
    smooth = np.where(den > 1e-3, num / np.maximum(den, 1e-3), 0)
    # Fine detail of contact shadows: a second, tighter pass blended by how
    # far the coarse pass is from the pixel (where shadows are, edges are).
    sigma2 = sigma * 0.35
    num2 = cv2.GaussianBlur(L * inside, (0, 0), sigma2)
    den2 = cv2.GaussianBlur(inside, (0, 0), sigma2)
    fine = np.where(den2 > 1e-3, num2 / np.maximum(den2, 1e-3), smooth)
    detail = spec.get("lightDetail", 0.5)
    light = smooth * (1 - detail) + fine * detail
    ref = np.percentile(light[inside > 0], spec.get("refPercentile", 60))
    ratio = light / max(ref, 1e-3)
    depth = spec.get("shadowDepth", 0.8)
    shading = 1 - (1 - np.clip(ratio, 0, 1)) * depth
    start, rng = spec.get("highlightStart", 1.08), spec.get("highlightRange", 0.6)
    highlights = np.clip((ratio - start) / rng, 0, 1)
    # Floors beyond the mask carry no light information; keep neutral.
    shading = np.where(den > 1e-3, shading, 1)
    highlights = np.where(den > 1e-3, highlights, 0)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    shading = guided(gray, shading.astype(np.float32), 9, 4e-3)
    return shading, highlights.astype(np.float32)


def wall_shade(img, walls):
    """Wall luminance relative to its bright end: paint × this keeps the light."""
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32) / 255
    inside = walls > 0.5
    if not inside.any():
        return np.ones_like(L)
    ref = np.percentile(L[inside], 95)
    smooth = cv2.GaussianBlur(L, (0, 0), 1.2)
    return np.clip(smooth / max(ref, 1e-3), 0, 1)


def save_gray(arr, path, width):
    h, w = arr.shape
    out = cv2.resize(arr, (width, round(h * width / w)), interpolation=cv2.INTER_AREA)
    Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8), "L").save(path, optimize=True)


def save_alpha(arr, path, width):
    """A mask as the renderer reads it: black, opaque where the surface is."""
    h, w = arr.shape
    a = cv2.resize(arr, (width, round(h * width / w)), interpolation=cv2.INTER_AREA)
    a = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.zeros_like(a), a]), "LA").save(path, optimize=True)


def save_rgba(gray, alpha, path, width):
    h, w = gray.shape
    size = (width, round(h * width / w))
    g = cv2.resize(gray, size, interpolation=cv2.INTER_AREA)
    a = cv2.resize(alpha, size, interpolation=cv2.INTER_AREA)
    rgba = np.dstack([g, g, g, a])
    Image.fromarray(np.clip(rgba * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA").save(path, quality=82, method=6)


def despill(photo, floor, floor_hard):
    """Take the old floor's colour cast off the edges of what stands on it.

    A strongly coloured floor (an orange herringbone) tints the anti-aliased
    rim of every chair and leg; lay a grey floor and the rim glows. In a thin
    band outside the floor, the part of each pixel's chroma that points the
    floor's way is removed, scaled down with distance from the floor.
    """
    rgb = np.asarray(photo).astype(np.float32)
    H, W = rgb.shape[:2]
    mask = cv2.resize(floor, (W, H), interpolation=cv2.INTER_LINEAR)
    hard = cv2.resize(floor_hard, (W, H), interpolation=cv2.INTER_NEAREST) > 0.5
    lab = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    ab = lab[..., 1:] - 128
    direction = ab[hard].mean(0)
    direction /= max(np.linalg.norm(direction), 1e-3)
    # Distance outside the floor, in pixels at 1920.
    outside = cv2.distanceTransform((~hard).astype(np.uint8), cv2.DIST_L2, 3)
    band = np.clip(1 - (outside - 1) / 5, 0, 1) * (~hard) * (mask < 0.98)
    along = np.clip((ab * direction).sum(-1), 0, None)
    ab = ab - (band * along)[..., None] * direction
    lab[..., 1:] = np.clip(ab + 128, 0, 255)
    out = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)
    return Image.fromarray(out)


def overlay(img, mask, color, path):
    tint = img.copy().astype(np.float32)
    col = np.array(color, np.float32)
    m = mask[..., None]
    tint = tint * (1 - 0.55 * m) + col * 0.55 * m
    edge = cv2.morphologyEx((mask > 0.5).astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    tint[edge > 0] = (0, 0, 255)
    cv2.imwrite(path, tint.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 85])


ROOT = Path(__file__).resolve().parent.parent


def source_photo(room: str) -> str:
    if len(sys.argv) > 2:
        return sys.argv[2]
    for candidate in (ROOT / f"scripts/rooms/src/{room}.jpg", ROOT / f"public/rooms/{room}/photo.webp"):
        if candidate.exists():
            return str(candidate)
    raise SystemExit(f"No source photo for {room}")


def main():
    room = sys.argv[1]
    spec = json.loads((ROOT / f"scripts/rooms/{room}.json").read_text())
    photo_path = source_photo(room)
    src = cv2.imread(photo_path)
    H0, W0 = src.shape[:2]
    w, h = WORK_WIDTH, round(H0 * WORK_WIDTH / W0)
    img = cv2.resize(src, (w, h), interpolation=cv2.INTER_AREA)

    floor_hard = grabcut(img, spec["floor"], w, h)
    manual = spec["floor"].get("manual")
    if manual:
        # Thin structures (chair bases, table pedestals) are drawn, not found:
        # inside the region, floor is everything the drawing does not cover.
        region = np.zeros((h, w), np.uint8)
        fill(region, [manual["region"]], 1, w, h)
        drawn = np.ones((h, w), np.float32)
        fill(drawn, manual.get("not"), 0, w, h)
        fill(drawn, manual.get("keep"), 0, w, h)
        for x1, y1, x2, y2, t in manual.get("notLines", []):
            cv2.line(drawn, (round(x1 * w), round(y1 * h)), (round(x2 * w), round(y2 * h)), 0, max(1, round(t * w)))
        for x, y, r in manual.get("dots", []):
            cv2.circle(drawn, (round(x * w), round(y * h)), max(1, round(r * w)), 0, -1)
        if manual.get("reclaim"):
            # Drawn legs are wider than the chrome; inside them, whatever is
            # the old floor's colour is floor, or it shows as a halo.
            # Everything drawn by hand is wider than the thing it covers, except
            # the shapes listed under `keep` (a wooden table top can match the
            # floor's colour and must stay).
            lines = np.zeros((h, w), np.uint8)
            fill(lines, manual.get("not"), 1, w, h)
            fill(lines, manual.get("keep"), 0, w, h)
            for x1, y1, x2, y2, t in manual.get("notLines", []):
                cv2.line(lines, (round(x1 * w), round(y1 * h)), (round(x2 * w), round(y2 * h)), 1, max(1, round(t * w)))
            for x, y, r in manual.get("dots", []):
                cv2.circle(lines, (round(x * w), round(y * h)), max(1, round(r * w)), 1, -1)
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
            floor_px = (drawn > 0) & (region > 0)
            # Chroma only: the floor under the table is the same colour in shadow.
            mean_ab = lab[..., 1:][floor_px].mean(0)
            dist = np.linalg.norm(lab[..., 1:] - mean_ab, axis=-1)
            chroma = np.linalg.norm(lab[..., 1:] - 128, axis=-1)
            reclaim = (lines > 0) & (region > 0) & (dist < manual.get("reclaimDistance", 9)) & (chroma > 12)
            reclaim = cv2.morphologyEx(reclaim.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
            drawn = np.where(reclaim, 1, drawn)
            # Specks the colour test lets through inside a white shell are not floor.
            count, labels, stats, _ = cv2.connectedComponentsWithStats((drawn > 0).astype(np.uint8))
            for i in range(1, count):
                if stats[i, cv2.CC_STAT_AREA] < 40:
                    drawn[labels == i] = 0
        floor_hard = np.where(region > 0, drawn, floor_hard)
    floor = soft_edges(img, floor_hard)
    overlay(img, floor, (60, 200, 60), f"/tmp/review_{room}_floor.jpg")

    out = ROOT / f"public/rooms/{room}"
    out.mkdir(parents=True, exist_ok=True)

    shading, highlights = light_maps(img, floor, spec)
    preview = (shading[..., None] * 255).repeat(3, 2).astype(np.uint8)
    cv2.imwrite(f"/tmp/review_{room}_shading.jpg", preview)
    cv2.imwrite(f"/tmp/review_{room}_highlights.jpg", (highlights * 255).astype(np.uint8))

    save_alpha(floor, out / "floor.png", MAP_WIDTH)
    save_gray(shading, out / "shading.png", MAP_WIDTH)
    save_gray(highlights, out / "highlights.png", MAP_WIDTH)

    meta = {
        "quad": [{"x": x, "y": y} for x, y in spec["quad"]],
        "widthM": spec.get("widthM", 4),
        "rotation": spec.get("rotation", 0),
        "label": spec["label"],
        "kind": spec.get("kind", "living"),
        "size": {"width": OUT_WIDTH, "height": round(H0 * OUT_WIDTH / W0)},
    }

    if "rug" in spec:
        rug_hard = grabcut(img, spec["rug"], w, h, iterations=6)
        # Grown a few pixels into the floor around it: a rug's fringe and the
        # soft edge between rug and floor belong to neither mask otherwise, and
        # would outline the rug that is no longer there.
        grow = spec["rug"].get("grow", 5)
        rug_hard = cv2.dilate(rug_hard, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
        rug_hard = np.where(floor_hard > 0, 0, rug_hard) if spec["rug"].get("keepFloor", False) else rug_hard
        rug = soft_edges(img, rug_hard)
        overlay(img, rug, (40, 160, 230), f"/tmp/review_{room}_rug.jpg")
        save_alpha(rug, out / "rug.png", MAP_WIDTH)
        # Light under the rug, measured against the rug itself with a blur wide
        # enough to lose its pattern, so hiding the rug keeps furniture shadows.
        rs, _ = light_maps(img, rug, {**spec, "lightBlur": spec.get("rugBlur", 0.03), "lightDetail": 0.2, "refPercentile": 70})
        shading = np.where(rug > 0.5, rs, shading)
        shading = cv2.GaussianBlur(shading, (0, 0), 1.5)
        save_gray(shading, out / "shading.png", MAP_WIDTH)
        meta["rug"] = True

    if "walls" in spec:
        manual_walls = spec["walls"].get("manual")
        if manual_walls:
            # Plain planes with a few square things in front of them: drawn,
            # because textured walls (brick, panelling) defeat colour models.
            walls_hard = np.zeros((h, w), np.float32)
            fill(walls_hard, manual_walls["regions"], 1, w, h)
            fill(walls_hard, manual_walls.get("not"), 0, w, h)
            for x1, y1, x2, y2, t in manual_walls.get("notLines", []):
                cv2.line(walls_hard, (round(x1 * w), round(y1 * h)), (round(x2 * w), round(y2 * h)), 0, max(1, round(t * w)))
        else:
            walls_hard = grabcut(img, spec["walls"], w, h, iterations=6)
        walls = soft_edges(img, walls_hard)
        overlay(img, walls, (200, 120, 40), f"/tmp/review_{room}_walls.jpg")
        save_rgba(wall_shade(img, walls), walls, out / "walls.webp", MAP_WIDTH)
        meta["walls"] = True

    (out / "meta.json").write_text(json.dumps(meta, indent=2))

    photo = Image.open(photo_path).convert("RGB")
    big = photo.resize((OUT_WIDTH, meta["size"]["height"]), Image.LANCZOS)
    if spec.get("despill"):
        big = despill(big, floor, floor_hard)
    big.save(out / "photo.webp", quality=82, method=6)
    thumb = photo.resize((480, round(H0 * 480 / W0)), Image.LANCZOS)
    thumb.save(out / "thumb.webp", quality=78, method=6)
    print(room, "floor share %.3f" % floor_hard.mean(), "->", out)


if __name__ == "__main__":
    main()
