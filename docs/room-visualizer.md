# Room visualizer — architecture

How a customer's room photograph gets a new floor, why the maths is what it is,
and how the floor is found in the first place.

## The journey

1. **Add a room.** Upload a photo, take one on a phone, or start from a demo
   room. An upload becomes an object URL and is read straight into a canvas —
   it never touches the network.
2. **The floor is found automatically.** A segmentation model labels the floor
   pixels; the visitor can drag the four corners to correct the perspective at
   any point, and marks the floor by hand if detection cannot help.
3. **Choose a material.** The picker is the live catalogue, one entry per
   colour a product comes in, each with its real price.
4. **Fine-tune.** Plank size, direction, material brightness, and how strongly
   the room's own light shows through.
5. **Keep it.** Download a PNG, or save to get a share link.

## Where the work happens

| Path                                        | Responsibility                                            |
| ------------------------------------------- | --------------------------------------------------------- |
| `src/lib/visualizer/homography.ts`          | The projective map from material to photograph.           |
| `src/lib/visualizer/detect-floor.ts`        | Segmentation model → floor mask and perspective quad.     |
| `src/lib/visualizer/render.ts`              | Canvas rendering: tiling, the mesh, and light blending.   |
| `src/lib/visualizer/types.ts`               | Geometry and placement types, in normalised coordinates.  |
| `src/components/visualizer/RoomStage.tsx`   | The canvas, corner handles and before/after wipe.         |
| `src/components/visualizer/MaterialPicker.tsx` | Catalogue materials as swatches.                       |
| `src/components/visualizer/VisualizerStudio.tsx` | State, controls, download, save and share.           |
| `src/components/visualizer/useFloorDetection.ts` | Runs detection per room, out of the render path.    |
| `src/app/(site)/visualizer/page.tsx`        | Server component; fetches the catalogue.                  |
| `src/app/api/visualizations/route.ts`       | Proxies a save to Laravel, keeping the API URL server-side. |

Everything renders in the browser, including detection. The only network calls
are the model download and the save, which is the customer's explicit choice —
good for privacy and for anyone on a Nigerian mobile connection.

## Mask and quad answer different questions

This distinction is the heart of the design, and conflating the two is what
made an earlier version lay floors across sofas.

- The **mask** is the exact set of floor pixels. It decides *where* material
  may be drawn, and it is what lets material stop at a chair leg.
- The **quad** is four points on the floor plane. It decides *how* the material
  recedes, and nothing else.

A quad alone cannot express "floor, except where the sofa is" — a real floor's
visible outline is bounded by furniture, not by walls, so fitting lines to that
outline traces the sofa. A mask alone carries no perspective. Together they are
sufficient.

Concretely: the mesh is composed off-screen, the lighting pass is applied, and
a single `destination-in` composite trims the result to the mask before it
reaches the photograph. Without a mask — a hand-marked floor — the quad is
clipped to and does both jobs, as it must.

## Automatic floor detection

SegFormer-B0 trained on ADE20K, run in the browser through Transformers.js.
ADE20K has a dedicated floor class, and the quantised B0 weights are under 3MB
— small enough to fetch on mobile data, which rules out the larger indoor-scene
models. It is dynamically imported, so visitors who never reach the visualizer
never pay for it, and it stays out of the initial bundle entirely.

From the model's per-pixel labels:

1. Floor classes are merged into one binary mask.
2. The largest connected region is kept, discarding stray patches — a strip of
   hallway through a doorway, a reflection the model mislabelled. The flood
   fill is iterative; a recursive one overflows the stack on a floor filling
   half a photograph.
3. The perspective quad is built from the two things a floor mask reports
   reliably: how far up the photograph the floor reaches, and roughly where it
   recedes to. The near edge spans the floor's width at the bottom of frame;
   the far edge is centred on the middle of its furthest rows, narrowed by how
   much the floor has closed in by then.

Step 3 deserves its scars. Fitting straight lines to the mask's left and right
boundaries seems obvious and is wrong: on a real room it latches onto a sliver
of floor past a staircase and skews the whole quad. Measuring the floor's
*extent* over a band of rows is far steadier, and only has to be approximately
right because the mask handles containment.

Detection never blocks: the room and material render immediately against a
default floor area, and the detected result replaces it when ready.

## The homography

A floor is flat. A camera maps one plane to another by a **homography** — a 3×3
matrix in homogeneous coordinates. So if we know where the floor's four corners
landed in the photo, we know where *every* point of the material lands. No depth
data and no camera calibration — four corners is the entire input.

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

## Extending it

The same mask opens up most of what the PRD calls Phase 2: multiple surfaces in
one room, and wall materials — which is the same homography applied to a
vertical plane, with the wall classes instead of the floor ones.

Worth knowing before changing detection: a wrong-but-confident result is more
annoying than none, so keep the manual path one tap away, and keep detection
off the critical path of the first render. Rooms with strong shadows or
reflective tiles segment least well.

If detection quality needs to improve, the next lever is a larger SegFormer
variant (B2–B5) behind a capability check, rather than post-processing the B0
mask harder.
