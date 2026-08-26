# Room visualizer — architecture

How a customer's room photograph gets a new floor, why the maths is what it is,
and where automatic floor detection would slot in.

## The journey

1. **Add a room.** Upload a photo, take one on a phone, or start from a demo
   room. An upload becomes an object URL and is read straight into a canvas —
   it never touches the network.
2. **Mark the floor.** Four draggable corners, in the order far-left,
   far-right, near-right, near-left. Touch, mouse and arrow keys all work.
3. **Choose a material.** The picker is the live catalogue, one entry per
   colour a product comes in, each with its real price.
4. **Fine-tune.** Plank size, direction, material brightness, and how strongly
   the room's own light shows through.
5. **Keep it.** Download a PNG, or save to get a share link.

## Where the work happens

| Path                                        | Responsibility                                            |
| ------------------------------------------- | --------------------------------------------------------- |
| `src/lib/visualizer/homography.ts`          | The projective map from material to photograph.           |
| `src/lib/visualizer/render.ts`              | Canvas rendering: tiling, the mesh, and light blending.   |
| `src/lib/visualizer/types.ts`               | Geometry and placement types, in normalised coordinates.  |
| `src/components/visualizer/RoomStage.tsx`   | The canvas, corner handles and before/after wipe.         |
| `src/components/visualizer/MaterialPicker.tsx` | Catalogue materials as swatches.                       |
| `src/components/visualizer/VisualizerStudio.tsx` | State, controls, download, save and share.           |
| `src/app/(site)/visualizer/page.tsx`        | Server component; fetches the catalogue.                  |
| `src/app/api/visualizations/route.ts`       | Proxies a save to Laravel, keeping the API URL server-side. |

Everything renders in the browser. The only network call is the save, which is
the customer's explicit choice — good for privacy and for anyone on a Nigerian
mobile connection.

## The homography

A floor is flat. A camera maps one plane to another by a **homography** — a 3×3
matrix in homogeneous coordinates. So if we know where the floor's four corners
landed in the photo, we know where *every* point of the material lands. No depth
data, no camera calibration, no model download. Four corners is the entire input.

```
⎡ a  b  c ⎤        x = (a·u + b·v + c) / (g·u + h·v + 1)
⎢ d  e  f ⎥        y = (d·u + e·v + f) / (g·u + h·v + 1)
⎣ g  h  1 ⎦
```

`(u, v)` are coordinates on the material, `(x, y)` pixels in the photograph.
The divisor is the whole trick: it grows towards the far wall, shrinking
everything mapped through it. That is foreshortening, and it is why planks
converge instead of marching along at a uniform size.

### Solving it

The general Direct Linear Transform solves an 8×8 system for four arbitrary
point correspondences. Here the source is always the unit square — `(0,0)`,
`(1,0)`, `(1,1)`, `(0,1)` — and that system collapses to closed-form arithmetic
(Heckbert, *Fundamentals of Texture Mapping and Image Warping*, §2.2). It is
exact, allocates nothing, and cannot fail to converge.

Two shapes are special-cased: a parallelogram (a floor viewed square-on) has no
perspective term, and a collapsed quad falls back to an affine map so a
mis-dragged corner still renders something instead of dividing by zero.

### Drawing it on a 2D canvas

`setTransform` is affine — it cannot divide by `w`, so it cannot do perspective
on its own. The material is therefore drawn as a **mesh of small cells**: each
cell's corners are projected through the homography, and the cell itself is
filled with an affine transform. Across a cell a few pixels wide, affine and
projective are indistinguishable; the mesh as a whole is perspective-correct.

Two details make it hold up:

- **Rows are spaced evenly on screen, not evenly across the material.** Along
  the quad's centre line the homography reduces to `y = (A + Bv)/(C + Dv)`,
  which inverts to `v = (A − yC)/(yD − B)`. That answers "which part of the
  material lands on this screen row?" exactly, putting fine subdivision where
  foreshortening is strongest and coarse subdivision underfoot where it is not.
- **Cells overlap by about 1.5px** so no seam shows between them. The clip path
  keeps the bleed inside the marked floor.

Cell counts adapt to the floor's size on screen, between 16 and 160 rows.

### Why not WebGL?

A fragment shader would do the divide per pixel and be the obvious choice for a
desktop tool. This one is aimed at mid-range Android phones on mobile data,
where a 2D canvas starts instantly, needs no context loss handling, and
degrades predictably. The mesh is rendered on demand — when a control changes,
not sixty times a second — so the cost lands once per adjustment.

### Making it look real

Perspective alone gives a floor-shaped sticker. The photograph is then
**multiplied back over** the rendered material, carrying its shadows,
reflections and light falloff onto the new floor. That single composite does
most of the work of making the result read as the same room, and its strength
is the "Room lighting" control.

## Verifying it without a browser

The geometry is checked numerically — corner correspondence, straightness,
monotonic depth, even screen spacing, foreshortening ratios, and degenerate
input — across a symmetric trapezoid, an asymmetric angled floor, a
parallelogram and an extreme wide-angle quad.

The check that matters most is **"a straight plank stays straight"**: sample
three points along a line on the material, project them, and confirm they stay
collinear. A per-row approximation fails this; a real homography cannot.

What numbers cannot confirm is whether a room *looks* right. That needs eyes on
a real photograph.

## Saving and sharing

`POST /api/visualizations` (Next.js) forwards the browser-rendered image to
`POST /api/v1/visualizations` (Laravel), which stores the render, the room
photo, the chosen variation and the placement, and returns an unguessable share
token. `/visualizer/s/{token}` opens it for anyone holding the link — no
account, because the person choosing the floor often is not the person paying
for it. Those pages are `noindex`, and a dead link explains itself.

Placement is stored in **normalised coordinates** (0–1 of the photo's width and
height), so a saved visualisation survives a different screen size or a
re-render at another resolution.

## Adding automatic floor detection

Manual corners are the MVP, and deliberately so: they always work, on any photo,
with no download. Automatic detection should *propose* corners, never replace
the ability to drag them.

The seam to extend is small. `VisualizerStudio` owns the quad and passes it
down; anything that can produce four corners can drive the visualizer.

1. **Segment the floor.** Run a semantic segmentation model in the browser via
   TensorFlow.js or ONNX Runtime Web — a model trained on indoor scenes
   (ADE20K includes a floor class) gives a per-pixel mask. Load it lazily, only
   when the visitor asks, so nobody pays for the download who does not use it.
2. **Take the largest floor region.** Threshold the mask, label connected
   components, keep the biggest.
3. **Reduce it to four corners.** Trace the contour, simplify it
   (Douglas–Peucker), and either take a minimum-area quadrilateral fit or the
   four extreme corners. Order them far-left, far-right, near-right, near-left
   to match `Quad`.
4. **Hand them over.** Call `setQuad(detected)` and turn adjustment on so the
   visitor can correct it. Nothing else in the pipeline changes — the
   homography does not care where its four corners came from.

Worth knowing before starting: rooms with rugs, strong shadows or reflective
tiles segment poorly, and a wrong-but-confident auto-detection is more annoying
than no auto-detection. Keep the manual path one tap away.

Beyond that, the same mask enables what the PRD calls Phase 2 — furniture-aware
masking (so a sofa is not carpeted), multiple surfaces in one room, and wall
materials, which is the same homography applied to a vertical plane.
