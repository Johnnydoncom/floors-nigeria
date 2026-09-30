# Room visualizer and designer — architecture

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
| `src/lib/visualizer/coverage.ts`            | How much material to lay, so the whole floor is covered.  |
| `src/lib/visualizer/floor-mask.ts`          | The label map sorted into floor, structure and occluders. |
| `src/lib/visualizer/detect-floor.ts`        | Segmentation model → floor mask and perspective quad.     |
| `src/lib/visualizer/render.ts`              | Canvas rendering: tiling, the mesh, and light blending.   |
| `src/lib/visualizer/types.ts`               | Geometry and placement types, in normalised coordinates.  |
| `src/components/visualizer/RoomStage.tsx`   | The canvas, corner handles and before/after wipe.         |
| `src/components/visualizer/MaterialPicker.tsx` | Catalogue materials as swatches.                       |
| `src/components/visualizer/VisualizerStudio.tsx` | State, controls, download, save and share.           |
| `src/components/visualizer/useFloorDetection.ts` | Runs detection per room, out of the render path.    |
| `src/app/(site)/visualizer/page.tsx`        | Server component; fetches the catalogue.                  |
| `src/app/api/visualizations/route.ts`       | Proxies a save to Laravel, keeping the API URL server-side. |
| `scripts/visualizer-coverage.test.mjs`      | The coverage guarantee, checked without a browser.        |
| `scripts/floor-mask.test.mjs`               | The mask rules, against the mistakes the model makes.     |

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
- The **domain** is a rectangle in the material's own coordinates — `[u0,u1] ×
  [v0,v1]`, free to reach well outside the unit square. It decides *how much*
  material is laid.

A quad alone cannot express "floor, except where the sofa is" — a real floor's
visible outline is bounded by furniture, not by walls, so fitting lines to that
outline traces the sofa. A mask alone carries no perspective. Together they are
sufficient.

The domain is the piece that took longest to arrive, and its absence was a
visible bug: material over the middle of a room, the edges left on their old
covering. Drawing the unit square of the quad covers the floor only when the
quad happens to contain the whole mask, and it usually does not — a quad fitted
to the open middle of a floor stops short of the skirting, and a visitor who
drags a corner can put it anywhere. So the renderer widens its own domain until
the image of that rectangle contains every floor pixel, and lets the mask alone
decide the outline (`coverage.ts`).

Widening is safe in a way that clipping is not. An oversized domain costs mesh
cells and nothing else, because the mask trims the overhang; an undersized one
costs bare floor. So the quad is *never* clipped to when a mask is present —
that clip is what put the floor back inside the quad.

Concretely: the mesh is composed off-screen, the lighting pass is applied, and
a single `destination-in` composite trims the result to the mask before it
reaches the photograph. Without a mask — a hand-marked floor — the quad is
clipped to and does all three jobs, as it must.

Finding the domain is a few points of arithmetic per outline point. `u` and `v`
are linear-fractional in the photograph's `(x, y)`, and such a function attains
its extremes over a convex region at a vertex, so the mask's convex hull carries
every extreme the domain needs — a few dozen points rather than a megapixel. The
hull is computed once per mask and cached against it, so moving a slider does
not re-scan the floor.

Two things are refused rather than trusted. A point mapping to behind the camera
is not on the visible floor plane and would drag the domain through infinity, so
it is dropped. A point past the domain's bound is *clamped*, not dropped —
dropping it silently leaves that floor bare, which is the whole failure being
fixed. The domain is then pulled back until all four corners sit in front of the
horizon, which for a divisor linear in `(u, v)` is enough to keep the whole
rectangle there.

## Automatic floor detection

SegFormer-B0 trained on ADE20K, run in the browser through Transformers.js.
ADE20K has a dedicated floor class, and the quantised B0 weights are under 3MB
— small enough to fetch on mobile data, which rules out the larger indoor-scene
models. It is dynamically imported, so visitors who never reach the visualizer
never pay for it, and it stays out of the initial bundle entirely.

### Three piles, not one

Merging the floor classes and stopping there produces two faults visible in any
photograph of a real room, and both were reported from one:

- **Material up the walls and over the staircase.** A floor and a skirting board
  are the same colour under the same light, and a stair tread is a horizontal
  walkable surface — which is what the floor class was trained on. A panelled
  door and a framed picture in a wood tone go the same way.
- **Bare patches in the middle of the floor.** A rug, a pool of sunlight, a
  reflection: the model labels them something else, they become holes, and the
  old covering shows through the middle of the room.

Neither is fixable from the floor class alone, and both are answerable from the
rest of the label map. So every class is sorted (`floor-mask.ts`) into the
**floor** itself; **structure**, which cannot lie in a floor plane — wall,
ceiling, stairs, door, window, picture, railing, column; and **occluders**, the
things that stand on a floor and legitimately hide it — furniture, appliances,
people, plants.

The third pile is the **default**, and that is the important part. The piles
then disagree usefully: where floor overlaps structure, floor is wrong; where
the floor closes around a pocket of structure, that is a mislabel and the floor
takes it back; and where a pocket is something in the room, it stays a hole,
which is what keeps material off a sofa and out from under a chair.

### Two ways of being cleverer, both of which are worse

Both were built, and both are recorded here because they look obviously right.

**Listing the furniture instead.** Name the things that stand on a floor, and
treat any other class as a misread the floor should close over. It covers a rug
the model called sand — and it also lays the new floor over a coffee table and
two footstools, because a segmentation model does not name furniture the way a
list of furniture expects. Every class missing from the list is a piece of
furniture material is laid across. The list can never be complete, so the
default has to be the safe one.

**Asking geometry.** Map each thing in the room back onto the floor plane
through the inverse homography and keep whatever could be lying in it: a rug
should measure a few metres by a few metres, a footstool should measure metres
deep because its top is not on the floor at all. The measurement says otherwise.
Over the same floor a rug comes out 0.82 as deep as it is wide and a footstool
1.09 — a silhouette carries no height, and the two are not separable. The test
that retired this is kept, because the idea is convincing enough to be tried
again.

What is left is that a rug is only covered when the model says it is a rug. It
usually does. When it does not, the rug keeps its own surface, which is what
happens on RoomVo too, and is at worst a floor that stops at the rug rather than
a floor laid across the furniture.

The floor is also stood back a couple of pixels from anything structural, and
from nothing else. The asymmetry is the point: a hairline of the old floor along
a skirting board is invisible, material a hairline up the wall is the first
thing anyone sees, and at a chair leg the floor genuinely does continue to the
edge of the object.

From the model's per-pixel labels:

1. Floor classes are merged into one binary mask. Labels are matched token by
   token, because the same checkpoint is published with both short names
   (`rug`) and ADE20K's full synonym lists (`rug;carpet;carpeting`); missing a
   class here loses a whole area of floor.
2. The floor is split into connected patches, and a patch other than the
   largest is kept only if it could be more of the same floor. A floor is often
   not one connected shape — a console table against a wall, a kitchen island,
   a doorway through to a hall all cut it in two — so keeping only the biggest
   piece leaves the rest on its old covering. But size is not enough to tell a
   second piece of floor from a mistake: a panelled door the model called floor
   is easily larger than a genuine strip past an island.

   What separates them is depth. A patch may not begin further away than the
   floor itself reaches, because there is no floor behind the far wall for it
   to be part of, and it must come down to at least where the floor begins
   rather than floating in the wall above it. A door, a picture and a flight of
   stairs each fail; a strip of floor past an island passes. The test says
   nothing about horizontal position, because the case it exists for leaves two
   patches side by side sharing no columns at all.

   The flood fill is iterative — a recursive one overflows the stack on a floor
   filling half a photograph — and eight-connected, so a patch pinched to a
   diagonal by a chair leg stays one patch rather than two half-sized ones that
   then both fail.
3. The perspective quad is built from the two things a floor mask reports
   reliably: how far up the photograph the floor reaches, and roughly where it
   recedes to. The near edge spans the floor's width at the bottom of frame;
   the far edge is centred on the middle of its furthest rows, narrowed by how
   much the floor has closed in by then.
4. That quad is then stretched along its own plane to fit the floor, by the
   same domain arithmetic the renderer uses — but bounded modestly and pulled
   back inside the photograph, because these four corners carry the drag
   handles, and a handle out in the margins is a handle nobody can reach.
   Coverage no longer depends on the result: the renderer widens its own domain
   over the mask whatever quad it is given.

Step 3 deserves its scars. Fitting straight lines to the mask's left and right
boundaries seems obvious and is wrong: on a real room it latches onto a sliver
of floor past a staircase and skews the whole quad. Measuring the floor's
*extent* over a band of rows is far steadier, and only has to be approximately
right because the mask handles containment.

### Snapping the boundary to the photograph

SegFormer decides at a quarter of its input resolution. The mask arrives at
full size, but its boundary follows that coarse decision, and at a wall
junction the error is visible twice over: material creeps up the skirting on
one side, a sliver of old floor survives on the other.

The photograph knows exactly where the wall is. Each pixel near the boundary is
re-decided by a vote of the mask values around it, weighted by how similar the
photograph's colour is at each point (`refine-mask.ts`). Across a junction the
colours differ, the far side's votes are discounted, and the boundary settles
where a human would draw it.

Pixels the model assigned to a structural class are locked out of that vote.
Colour alone cannot tell a floorboard from the skirting board above it, so
without the lock the snap that fixes one wall walks the material up the next.

Only the boundary band is touched — found by dilating the set of pixels that
differ from a neighbour — which is what keeps this at a few hundred
milliseconds instead of a few seconds. Pinholes below a speckle threshold are
filled; the far larger holes furniture makes are left alone.

The mask is then composited with `imageSmoothingEnabled = false`, or scaling
would feather the boundary straight back out.

Detection never blocks: the room and material render immediately against a
default floor area, and the detected result replaces it when ready.

## Textures

The material tiled across the floor is a square taken from the middle of the
product photograph. Catalogue photography is staged — a plank propped on a
pallet, a tile in shrink wrap, a sprig of greenery for scale — and tiling the
whole frame repeats those props across the room.

The crop is damage limitation, not a fix. Products carry a dedicated
`visualizer_texture` media collection for a seamless, render-optimised asset,
and it takes precedence over the hero image whenever one is uploaded (§24).
Until a product has one, its preview is only as good as the middle of its
marketing shot.

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
- **Cells overlap by about 1.5px, plus 3% of the cell.** A cell is filled with
  an affine transform, so its corners land on a parallelogram while the true
  projection is a trapezoid, and the mismatch grows with the cell. A fixed
  bleed closes the seam underfoot and leaves a fine bright wedge showing up the
  room; the proportional part removes it. The mask — or the clip path, without
  one — keeps the bleed inside the floor.

Cell counts adapt to the floor's size on screen, between 16 and 160 rows, and
are measured from the part of the mesh that lands in frame: a domain reaching
well past the photograph would otherwise spend its whole budget off-canvas.

The domain is laid in **bands of bounded depth**, each from its own off-screen
plane. A domain running towards the horizon is deep in material terms and
shallow on screen, so one plane would spend its rows on floor occupying a dozen
pixels and starve the floor underfoot. Bands abut exactly, and every plane is
anchored to the same point in material coordinates — the quad's middle — so the
pattern runs continuously across the joins, and widening the domain lays more
planks around the ones already on screen rather than shifting every plank the
visitor was looking at.

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

Coverage has a suite of its own — `npm run test:visualizer` — because "the
floor is not all covered" is the failure a customer reports first. Over floor
shapes real photographs produce (a sofa bitten out, a floor split in two by a
table, an L-shape turning a corner, a deep room reaching towards the horizon)
it asserts that **every floor pixel maps inside the domain**, both along the
quad detection produces and along a quad dragged nowhere near the floor. One
test asserts the opposite for the unit square alone: if laying only the quad
ever stops leaving floor bare, the other checks have stopped proving anything.

The mask rules have a suite of their own alongside it, built from the mistakes
the model actually makes: a floor leaking onto a staircase, a wood-toned door
high on a wall, a hole the model could not place, a hole with a sofa in it, and
a floor cut in two at floor level. It runs on `node --test` behind a small loader (`scripts/ts-loader.mjs`) that
resolves the `@/` alias and strips the type annotations itself, rather than
leaving that to whichever Node is installed — Node only understands a `.ts`
file unaided from v22.18 on. So there is no test runner and no bundler to keep
up to date, and no version of Node the suite quietly refuses to run on.

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

## The room designer

A second, complementary tool at `/room-designer`. Where the photo visualizer
answers *"how would this look in my room?"*, the designer answers *"how much do
I need, and what will it cost?"*

- `src/lib/room/plan.ts` — the room: rectangle or L-shape, in metres. Area is
  the shoelace formula over the outline, so a new room shape needs no new
  arithmetic.
- `src/lib/room/material.ts` — plank size and the material estimate, sharing
  the calculator's waste-and-packs rules so the two can never disagree.
- `src/components/designer/PlanEditor.tsx` — dimension-led SVG plan.
- `src/components/designer/RoomScene.tsx` — react-three-fiber scene.
- `src/lib/room/ar-session.ts` — WebXR, written against three.js directly.

### True scale is the point

The variation record carries the plank size in millimetres, so the floor
texture repeats **once per plank**: `texture.repeat = (1/plankLengthM,
1/plankWidthM)`. A 1220 × 183mm board in a 4.5m room gives 24.6 boards across,
and that is what the customer sees. `ShapeGeometry` lays UVs out in the shape's
own coordinates — metres here — which is what makes that one-liner correct.

A photo visualizer cannot do this: it has no idea how big the room is. This is
the designer's reason to exist.

### AR

WebXR `immersive-ar` with a hit-test: point the phone at the floor, tap, and a
2.4m patch of the material is placed at that pose at true scale. Written
against three.js directly rather than through React — an XR session owns its
own render loop, and reconciling that with a React renderer buys nothing for a
single textured plane.

**Android Chrome only.** iOS Safari does not support WebXR and needs AR Quick
Look with a USDZ file, which is a different pipeline, not a fallback flag. The
button is hidden with an explanation on unsupported devices, and the 3D room
works everywhere.

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
