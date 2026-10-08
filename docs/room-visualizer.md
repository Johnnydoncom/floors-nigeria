# Room visualizer and designer — architecture

How a customer's room photograph gets a new floor, why the maths is what it is,
and how the floor is found in the first place.

## The journey

1. **Choose a floor.** From a product page ("See it in your room" opens the
   studio on that exact variation, and a QR code carries it to a phone), or
   inside the studio: search, filter by type, colour, brand and price, keep
   favourites, and come back to recently tried floors.
2. **Add a room.** Upload a photo, take one on a phone, or start from a sample
   room. Uploads are downscaled in the browser (`images.ts`) and never touch the
   network until the visitor saves or sends them.
3. **The floor is found automatically.** A segmentation model labels the floor
   pixels. The visitor can correct the perspective with four corners, paint
   floor in or out, or draw round an area — irregular rooms and floors split by
   furniture included.
4. **Lay it.** Pattern (as photographed, staggered, straight, herringbone,
   diagonal, grid), direction with 0°/45°/90° presets, real plank size, floor
   width, finish, and how strongly the room's own light shows through.
5. **Compare.** A draggable before/after wipe, the two side by side, or two
   floors in the same room. Zoom and pan to inspect.
6. **Keep and share.** Save to a link; share it through the phone's share sheet,
   WhatsApp, email, a copied link or a QR code; download the render or a
   labelled before-and-after image. Saved designs reopen in the studio.
7. **Act on it.** Add to the quote list with the area from the estimator (m² or
   ft²), request a quote or order a sample (both reach the CRM with the render
   attached), ask on WhatsApp, find a showroom — or view the floor in AR.

## Where the work happens

| Path                                                          | Responsibility                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/visualizer/homography.ts`                            | The projective map, and the floor's true proportions.        |
| `src/lib/visualizer/coverage.ts`                              | How much material to lay, so the whole floor is covered.     |
| `src/lib/visualizer/floor-mask.ts`                            | The label map sorted into floor, structure and occluders.    |
| `src/lib/visualizer/detect-floor.ts`                          | Segmentation model → floor mask and perspective quad.        |
| `src/lib/visualizer/patterns.ts`                              | Laying patterns as geometry: one repeating period each.      |
| `src/lib/visualizer/material-tile.ts`                         | A texture baked into planks or tiles, with joints.           |
| `src/lib/visualizer/lighting.ts`                              | The room's light, separated from the old floor.              |
| `src/lib/visualizer/mask-edits.ts`                            | Hand corrections to the floor area, as replayable edits.     |
| `src/lib/visualizer/render.ts`                                | Canvas rendering of surface layers: mesh, light, mask.       |
| `src/lib/visualizer/compose.ts`                               | The labelled before-and-after image.                         |
| `src/lib/visualizer/images.ts`                                | Upload downscaling, optimized textures, texture cache.       |
| `src/lib/visualizer/library.ts`                               | Favourites, recently tried and saved designs (browser).      |
| `src/lib/visualizer/types.ts`                                 | Geometry, placement and surface types.                       |
| `src/lib/room/materials.ts`                                   | Catalogue products → materials, with kind and variation.     |
| `src/lib/room/ar-*.ts`, `quick-look.ts`                       | AR: capability check, floor patch, WebXR, Quick Look.        |
| `src/lib/analytics.ts`                                        | Typed analytics events to GTM / gtag / a DOM event.          |
| `src/components/visualizer/RoomStage.tsx`                     | Canvas, compare modes, zoom/pan, corners, mask painting.     |
| `src/components/visualizer/VisualizerStudio.tsx`              | State, links in, save and share orchestration.               |
| `src/components/visualizer/MaterialBrowser.tsx`               | Search, filters, favourites and recent floors.               |
| `src/components/visualizer/AdjustPanel.tsx`                   | Pattern, direction, size, finish and light.                  |
| `src/components/visualizer/MaterialDetails.tsx`               | The product card, estimator and every CTA.                   |
| `src/components/visualizer/ShareDialog.tsx`, `LeadDialog.tsx` | Sharing; quote and sample requests.                          |
| `src/components/visualizer/ArLauncher.tsx`                    | "View in your room" for whichever AR the device has.         |
| `src/components/visualizer/useFloorDetection.ts`              | Runs detection per room, out of the render path.             |
| `src/app/(site)/visualizer/page.tsx`                          | Server component; popular materials and filter choices.      |
| `src/app/api/catalog/materials/route.ts`                      | Catalogue search/filter and product deep links as materials. |
| `src/app/api/visualizations/route.ts`                         | Proxies a save to Laravel, keeping the API URL server-side.  |
| `src/app/api/visualizations/[token]/route.ts`                 | A saved design, for reopening in the studio.                 |
| `src/app/api/leads/route.ts`                                  | Quote and sample requests → `POST /v1/quotes`.               |
| `scripts/visualizer-coverage.test.mjs`                        | The coverage guarantee, checked without a browser.           |
| `scripts/floor-mask.test.mjs`                                 | The mask rules, against the mistakes the model makes.        |
| `scripts/patterns.test.mjs`                                   | Every layout tiles; planks keep their real proportions.      |

Everything renders in the browser, including detection. The only network calls
are the model download, catalogue browsing, and saving or sending — the last
two the customer's explicit choice. Good for privacy and for anyone on a
Nigerian mobile connection.

## Mask and quad answer different questions

This distinction is the heart of the design, and conflating the two is what
made an earlier version lay floors across sofas.

- The **mask** is the exact set of floor pixels. It decides _where_ material
  may be drawn, and it is what lets material stop at a chair leg.
- The **quad** is four points on the floor plane. It decides _how_ the material
  recedes, and nothing else.
- The **domain** is a rectangle in the material's own coordinates — `[u0,u1] ×
[v0,v1]`, free to reach well outside the unit square. It decides _how much_
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
costs bare floor. So the quad is _never_ clipped to when a mask is present —
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
it is dropped. A point past the domain's bound is _clamped_, not dropped —
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
_extent_ over a band of rows is far steadier, and only has to be approximately
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

## Textures and patterns

A product texture is either a **dedicated seamless asset** uploaded to the
`visualizer_texture` media collection, or the marketing photograph standing in
for one. The API says which (`visualizer_texture_is_dedicated`), and the
difference decides everything below.

Catalogue photography is staged — a plank propped on a pallet, a skirting board
in frame, a lobby with dark inlay bands — so a photograph is cropped to its
middle and, by default, shown **as photographed**: repeated as it is, with no
joints of our own. Cutting a photograph of a whole floor into planks puts its
seams and props inside every board; that was tried against the catalogue's own
imagery, and it is why this is not the default. A dedicated texture defaults to
the product's natural pattern — staggered planks, a tile grid — and every layout
is a tap away either way.

### One period per pattern

Each layout is a rectangle that tiles the plane by plain translation, plus the
planks inside it (`patterns.ts`). The renderer bakes one period into a canvas
and repeats it, so a herringbone costs one bake per material change, not one
per slider movement. Planks hanging over an edge are drawn at the neighbouring
offsets too, which makes every period seamless without special cases.

- **Staggered / straight** — rows a whole number of planks wide, each shifted
  by half a plank, or by a fixed "random" offset that keeps neighbouring rows'
  end joints at least a fifth of a plank apart.
- **Herringbone** — horizontal plank _k_ at (kW, kW), its vertical partner at
  (kW − W, kW). The lattice is (W, W) and (2L, 0), so with L a whole number of
  widths the square 2L period holds exactly 2L/W pairs. Laid at 45° so the
  zigzag runs along the room.
- **Diagonal** — a grid (tiles) or a stagger (planks), turned 45°.
- **Grid** — stack bond.

`npm run test:visualizer` samples every layout and asserts each point is
covered by exactly one plank: a gap would show the old floor, an overlap would
draw one plank over another. The first version of the row layout failed it — a
duplicated leading plank — which is why the test exists.

### Baking a plank

Each plank is a strip of the texture with the plank's own proportions, taken
from a different place than its neighbours, randomly flipped, and toned a few
percent lighter or darker — a uniform field is what makes a render look
printed. Randomness is seeded from the texture, so a design looks the same every
time it opens. A texture whose grain runs down the image is first turned a
quarter (gradient energy along x versus y on a 64px copy), so planks are never
striped across their width. Planks sample in proportion to their real length
against an assumed 1.5m texture span, so a 600mm herringbone block shows the
same grain scale as a 1220mm board.

Planks get a micro-bevel — shadow on the far edges, a catch of light on the
near — and tiles get grout a little lighter and greyer than the tile. The bake
also produces a height map of the joints, which the AR view turns into a normal
map: real grooves that catch light, where the photo view has to paint them.

Bakes are sized to the resolution the plane draws them at (bucketed by powers of
√2 and cached), so a joint stays a crisp pixel or two rather than an eighth of
one shimmering after a heavy downscale.

### True proportions

The unit square maps to a rectangle on the floor, but nothing says a _square_
one: a quad marking a floor 4m wide and 6m deep is drawn exactly like one 4m by
4m, only foreshortened differently, and laying material in unit-square
coordinates squashes every plank along the room. `planeAspect` undoes the
camera: H = K[A·r₁, B·r₂, t], so once the intrinsics are removed the two
columns' lengths are in the ratio B : A. The focal length is assumed (0.7 × the
long side, a 26mm-equivalent phone camera); ±20% moves the result by a few
percent, and absurd quads clamp to a safe range. Tested against a synthetic
pinhole camera photographing floors of known size, angled and off-centre shots
included.

With depth known, the plane is laid **in metres**: its width is the visitor's
"floor width in the photo" — the one measurement a photograph cannot supply —
and planks are drawn at the variation's real millimetres against it.

### Light

Multiplying the raw photograph back over the material carried the _old floor_
with it: a dark floor darkened the new one, a red tile tinted it, and highlights
were lost because a multiply can only darken. `lighting.ts` divides each pixel's
blurred luminance by the floor's average. Below 1 is colourless shading centred
on the floor's own exposure, multiplied; above 1 is highlight, screened in
proportion to the finish (matte, satin, gloss). The blur takes out the old
floor's grain and grout lines, which are texture, not light. Computed once per
photo and floor area. Reflections of dark furniture in a glossy old floor still
read as shadows; "Room lighting" turns them down.

## The homography

A floor is flat. A camera maps one plane to another by a **homography** — a 3×3
matrix in homogeneous coordinates. So if we know where the floor's four corners
landed in the photo, we know where _every_ point of the material lands. No depth
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
(Heckbert, _Fundamentals of Texture Mapping and Image Warping_, §2.2). It is
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

### Why not WebGL for the photo?

A fragment shader would do the divide per pixel and be the obvious choice for a
desktop tool. This one is aimed at mid-range Android phones on mobile data,
where a 2D canvas starts instantly, needs no context loss handling, and
degrades predictably. The mesh is rendered on demand — when a control changes,
not sixty times a second — so the cost lands once per adjustment.

### Making it look real

Perspective alone gives a floor-shaped sticker. The room's own light is then
laid back over the rendered material — its shadows and falloff multiplied, its
highlights screened by finish (see _Light_, above) — which does most of the work
of making the result read as the same room. Its strength is the "Room lighting"
control. Where the photograph cannot be read back, the renderer falls back to
multiplying the photograph itself.

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

What numbers cannot confirm is whether a room _looks_ right. That needs eyes on
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

Saving also stores the layout, plank size, floor width, finish, lighting, the
hand edits to the floor area and — for a sample room — its path, so
`/visualizer?design={token}` reopens a design for editing rather than only
viewing. The quad is restored as saved, detection supplies the mask again, and
the edits replay on top. Edits are kept as normalised operations, not pixels,
which is also how undo works: a stack of full-resolution mask snapshots would
cost a phone tens of megabytes.

A guest's saves carry their session token, so they can be claimed into an
account later. The browser keeps its own list of saved designs (`library.ts`),
with favourites and recently tried floors; favourites are also sent to the
account when there is one.

## Leads

"Request a quote" and "Order a sample" post to `POST /api/leads`, which passes
the multipart body to the existing `POST /v1/quotes` with source `visualizer`.
The CRM gets a contact, a lead, an opportunity and a quote, with the render
attached and the visualised layout in the line note. A quote line carries the
variation and the estimator's area, priced server-side; a sample line carries
only the product and is priced at zero. No new endpoint, no schema change.

## Analytics

`track()` (`src/lib/analytics.ts`) sends typed events to GTM's `dataLayer` or to
`gtag`, whichever is loaded, and dispatches a `floorsng:analytics` DOM event:
visualizer opened, room selected, floor detected or failed, floor area edited,
product selected, visualization completed, layout changed, comparison used,
favourite saved, design saved or shared, image downloaded, lead submitted, CTA
clicked, AR launched, QR shown. Nothing is loaded by default, and tracking never
breaks a page.

## The room designer

A second, complementary tool at `/room-designer`. Where the photo visualizer
answers _"how would this look in my room?"_, the designer answers _"how much do
I need, and what will it cost?"_

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

One button, whichever AR the device has (`ArLauncher`, used by both tools):

- **Android Chrome** — WebXR `immersive-ar` with a hit-test: point the phone at
  the floor, tap, and a 2.4m patch is placed at true scale. Written against
  three.js directly; an XR session owns its own render loop.
- **iPhone and iPad** — Safari has no WebXR, but opens a USDZ model in AR Quick
  Look from a `rel="ar"` link. The model is exported in the browser by
  three.js's `USDZExporter` from the same patch, anchored to a horizontal plane,
  with content scaling off so it stays true size. No server pipeline: any
  catalogue material works the moment it is listed.
- **Everything else** — a QR code carrying the same floor to a phone, and the 3D
  room.

The patch is baked by the same pattern code as the photo view — the chosen
layout, plank size and direction — with the joints' normal map and a roughness
from the finish. It is baked rather than repeated on the GPU because Quick Look
ignores texture repeats on some versions. Capability detection lives in
`ar-support.ts`, apart from three.js, so asking costs the page nothing.

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
