#!/usr/bin/env python3
"""
Render a template room with a different floor, offline, the way the room
visualizer does in the browser (src/lib/visualizer/render.ts): the room's
floor quad gives a homography and a plane aspect, the material is laid in
metres, the baked shading is multiplied in and the highlights screened, and
the floor mask (minus the rug, if the room has one) trims it.

Used for the homepage hero's before/after slide:

    python3 scripts/render-room-swap.py scandi-lounge board.jpg \
        scripts/rooms/scandi-lounge-honey-oak.webp --board-width 1.22 --rotate 90

then `python3 scripts/home-images.py` sizes it for the hero.

`board.jpg` is one board of wood (grain along its long side); it is cut into
staggered planks first, like src/lib/visualizer/material-tile.ts does.
Needs numpy and opencv-python.
"""
import argparse, json, os
import numpy as np, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def plank_tile(board, seed=7, ppm=700, length_m=1.22, width_m=0.19, rows=6):
    """A seamless tile of staggered planks cut from one board."""
    rng = np.random.default_rng(seed)
    if board.shape[0] > board.shape[1]:
        board = cv2.rotate(board, cv2.ROTATE_90_CLOCKWISE)
    L, W = int(length_m * ppm), int(width_m * ppm)
    tile = np.zeros((W * rows, L, 3), np.float32)
    for r in range(rows):
        offset = int(rng.uniform(0.2, 0.8) * L)
        for k in range(-1, 2):
            x0 = offset + k * L
            sy = rng.integers(0, max(1, board.shape[0] - W))
            sx = rng.integers(0, max(1, board.shape[1] - L)) if board.shape[1] > L else 0
            crop = board[sy:sy + W, sx:sx + L]
            if crop.shape[1] < L or crop.shape[0] < W:
                crop = cv2.resize(crop, (L, W))
            if rng.random() < 0.5:
                crop = crop[:, ::-1]
            crop = crop * rng.uniform(0.95, 1.04)
            cols = (x0 + np.arange(L)) % L
            tile[r * W:(r + 1) * W, cols] = crop
            j = x0 % L
            tile[r * W:(r + 1) * W, j:j + 2] *= 0.72      # end joint
        tile[r * W:r * W + 2] *= 0.7                     # long-edge seam
        tile[r * W + 2:r * W + 4] *= 1.04                # bevel catchlight
    return np.clip(tile, 0, 1), length_m


def render(room, tile, tile_m, rotate_deg, supersample=2):
    base = os.path.join(ROOT, "public", "rooms", room)
    meta = json.load(open(os.path.join(base, "meta.json")))
    photo = cv2.imread(os.path.join(base, "photo.webp"), cv2.IMREAD_COLOR).astype(np.float32) / 255
    H, W = photo.shape[:2]
    Hs, Ws = H * supersample, W * supersample
    quad = np.float32([[p["x"] * Ws, p["y"] * Hs] for p in meta["quad"]])
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), quad)
    a, b, d, e, g, h = M[0, 0], M[0, 1], M[1, 0], M[1, 1], M[2, 0], M[2, 1]
    focal, cx, cy = max(Ws, Hs) * 0.7, Ws / 2, Hs / 2        # homography.ts planeAspect
    across = np.hypot(np.hypot((a - cx * g) / focal, (d - cy * g) / focal), g)
    along = np.hypot(np.hypot((b - cx * h) / focal, (e - cy * h) / focal), h)
    width_m = meta["widthM"]
    depth_m = width_m * float(np.clip(along / across, 0.25, 4))

    inv = np.linalg.inv(M)
    ys, xs = np.mgrid[0:Hs, 0:Ws].astype(np.float32)
    den = inv[2, 0] * xs + inv[2, 1] * ys + inv[2, 2]
    X = (inv[0, 0] * xs + inv[0, 1] * ys + inv[0, 2]) / den * width_m
    Y = (inv[1, 0] * xs + inv[1, 1] * ys + inv[1, 2]) / den * depth_m
    if rotate_deg:
        t = np.deg2rad(rotate_deg)
        X, Y = X * np.cos(t) - Y * np.sin(t), X * np.sin(t) + Y * np.cos(t)

    th, tw = tile.shape[:2]
    ppm = tw / tile_m
    mapx = ((X * ppm) % tw).astype(np.float32)
    mapy = ((Y * ppm) % th).astype(np.float32)
    # Far pixels cover many texels: blend toward a blurred copy by footprint.
    footprint = (np.abs(np.gradient(X, axis=1)) + np.abs(np.gradient(Y, axis=1))) * ppm
    blend = np.clip(np.log2(np.maximum(footprint, 1)) / 3, 0, 1)[..., None]
    sharp = cv2.remap(tile, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    soft = cv2.remap(cv2.GaussianBlur(tile, (0, 0), 3), mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    floor = cv2.resize(sharp * (1 - blend) + soft * blend, (W, H), interpolation=cv2.INTER_AREA)

    def load(name, flags=cv2.IMREAD_UNCHANGED):
        return cv2.resize(cv2.imread(os.path.join(base, name), flags), (W, H), interpolation=cv2.INTER_CUBIC)

    lighting = 0.8                                            # types.ts default
    shading = load("shading.png", cv2.IMREAD_COLOR).astype(np.float32) / 255
    highlights = load("highlights.png", cv2.IMREAD_COLOR).astype(np.float32) / 255
    floor = floor * (1 - lighting + lighting * shading)       # multiply
    floor = 1 - (1 - floor) * (1 - min(1, lighting * 0.35) * highlights)  # screen

    mask = load("floor.png")
    alpha = (mask[..., -1] if mask.ndim == 3 else mask).astype(np.float32) / 255
    if os.path.exists(os.path.join(base, "rug.png")):       # the rug stays
        rug = load("rug.png")
        alpha *= 1 - (rug[..., -1] if rug.ndim == 3 else rug).astype(np.float32) / 255
    return photo * (1 - alpha[..., None]) + floor * alpha[..., None]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("room", help="a folder in public/rooms")
    parser.add_argument("board", help="image of one board of the new floor")
    parser.add_argument("out", help="output image (.webp, .png or .jpg)")
    parser.add_argument("--board-width", type=float, default=1.22, help="plank length in metres")
    parser.add_argument("--rotate", type=float, default=90, help="plank direction, degrees")
    parser.add_argument("--contrast", type=float, default=1.35, help="grain contrast boost")
    args = parser.parse_args()

    board = cv2.imread(args.board, cv2.IMREAD_COLOR).astype(np.float32) / 255
    mean = board.mean((0, 1))
    board = np.clip((board - mean) * args.contrast + mean, 0, 1)
    tile, tile_m = plank_tile(board, length_m=args.board_width)
    image = render(args.room, tile, tile_m, args.rotate)
    params = [cv2.IMWRITE_WEBP_QUALITY, 80] if args.out.endswith(".webp") else []
    cv2.imwrite(args.out, np.clip(image * 255, 0, 255).astype(np.uint8), params)
    print("wrote", args.out)


if __name__ == "__main__":
    main()
