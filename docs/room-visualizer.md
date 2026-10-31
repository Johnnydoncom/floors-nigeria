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
3. **The floor is found automatically.** A sample room's floor was found ahead
   of time and ships as a small mask. For a room of the visitor's own, a
   segmentation model labels the floor pixels in the browser. Either way the
   visitor can correct the perspective with four corners, paint floor in or out,
   or draw round an area — irregular rooms and floors split by furniture
   included.
4. **Lay it.** Whatever is chosen covers the whole floor. Pattern (staggered,
   straight, herringbone, diagonal, grid, or as photographed), direction with
   0°/45°/90° presets, real plank size, floor width (worked out from the photo),
   finish, and how strongly the room's own light shows through.
5. **Compare.** A draggable before/after wipe, the two side by side, or two
   floors in the same room. Zoom and pan to inspect.
6. **Keep and share.** Save to a link; share it through the phone's share sheet,
   WhatsApp, email, a copied link or a QR code; download the render or a
   labelled before-and-after image. Saved designs reopen in the studio.
7. **Act on it.** Add to the quote list with the area from the estimator (m² or
   ft²), request a quote or order a sample (both reach the CRM with the render
   attached), ask on WhatsApp, find a showroom — or view the floor in AR.

## The tool comes first

Both tools open on the tool itself. `ToolHeading` is a single line, and the
explanation sits below in `ToolGuide`, where search engines still read it. A large
banner above a tool hid it entirely on a phone. On a phone the room is pinned under
the site header and capped at 46% of the screen, with floors directly beneath it;
on a larger screen a room fills its column, and only a portrait photo is narrowed
to fit the window height.

## Where the work happens

| Path                                                          | Responsibility                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/visualizer/homography.ts`                            | The projective map, and the floor's true proportions.            |
| `src/lib/visualizer/floor-raster.ts`                          | Every pixel → the material: WebGL2, with a JavaScript fallback.  |
| `src/lib/visualizer/material-patch.ts`                        | The clean rectangle of material inside a product photograph.     |
| `src/lib/visualizer/sample-floors.json`                       | Sample rooms' floors, baked by `scripts/bake-sample-floors.mjs`. |
| `src/lib/visualizer/coverage.ts`                              | Stretching the detected quad over the floor it found.            |
| `src/lib/visualizer/floor-mask.ts`                            | The label map sorted into floor, structure and occluders.        |
| `src/lib/visualizer/floor-detector.ts`                        | Main-thread side of detection: reads the photo, runs the worker. |
| `src/lib/visualizer/detect-floor.worker.ts`                   | Runs the model and mask analysis off the main thread.            |
| `src/lib/visualizer/texture-prep.ts`                          | Straighten, even out and make seamless a texture photo.          |
| `src/components/admin/TextureStudio.tsx`                      | The admin tool for preparing visualizer textures.                |
| `scripts/vendor-ort.mjs`                                      | Copies the ONNX runtime into `public/vendor/ort/<version>`.      |
| `src/lib/visualizer/detect-floor.ts`                          | Segmentation model → floor mask and perspective quad.            |
| `src/lib/visualizer/patterns.ts`                              | Laying patterns as geometry: one repeating period each.          |
| `src/lib/visualizer/material-tile.ts`                         | A texture baked into planks or tiles, with joints.               |
| `src/lib/visualizer/lighting.ts`                              | The room's light, separated from the old floor.                  |
| `src/lib/visualizer/mask-edits.ts`                            | Hand corrections to the floor area, as replayable edits.         |
| `src/lib/visualizer/render.ts`                                | Composes a surface: material, room light, then the mask.         |
| `src/lib/visualizer/compose.ts`                               | The labelled before-and-after image.                             |
| `src/lib/visualizer/images.ts`                                | Upload downscaling, optimized textures, texture cache.           |
| `src/lib/visualizer/library.ts`                               | Favourites, recently tried and saved designs (browser).          |
| `src/lib/visualizer/types.ts`                                 | Geometry, placement and surface types.                           |
| `src/lib/room/materials.ts`                                   | Catalogue products → materials, with kind and variation.         |
| `src/lib/room/ar-*.ts`, `quick-look.ts`                       | AR: capability check, floor patch, WebXR, Quick Look.            |
| `src/lib/analytics.ts`                                        | Typed analytics events to GTM / gtag / a DOM event.              |
| `src/components/visualizer/RoomStage.tsx`                     | Canvas, compare modes, zoom/pan, corners, mask painting.         |
| `src/components/visualizer/VisualizerStudio.tsx`              | State, links in, save and share orchestration.                   |
| `src/components/visualizer/MaterialBrowser.tsx`               | Search, filters, favourites and recent floors.                   |
| `src/components/visualizer/AdjustPanel.tsx`                   | Pattern, direction, size, finish and light.                      |
| `src/components/visualizer/MaterialDetails.tsx`               | The product card, estimator and every CTA.                       |
| `src/components/visualizer/ShareDialog.tsx`, `LeadDialog.tsx` | Sharing; quote and sample requests.                              |
| `src/components/visualizer/ArLauncher.tsx`                    | "View in your room" for whichever AR the device has.             |
| `src/components/visualizer/useFloorDetection.ts`              | Runs detection per room, out of the render path.                 |
| `src/components/tools/ToolIntro.tsx`                          | The one-line heading above each tool, and the guide below it.    |
| `src/app/(site)/visualizer/page.tsx`                          | Server component; popular materials and filter choices.          |
| `src/app/api/catalog/materials/route.ts`                      | Catalogue search/filter and product deep links as materials.     |
| `src/app/api/visualizations/route.ts`                         | Proxies a save to Laravel, keeping the API URL server-side.      |
| `src/app/api/visualizations/[token]/route.ts`                 | A saved design, for reopening in the studio.                     |
| `src/app/api/leads/route.ts`                                  | Quote and sample requests → `POST /v1/quotes`.                   |
| `scripts/floor-raster.test.mjs`                               | Every pixel receives material; the true-scale estimate.          |
| `scripts/material-patch.test.mjs`                             | Finding the material in cut-outs, staged shots and scenes.       |
| `scripts/visualizer-coverage.test.mjs`                        | Detection keeps its floor; the quad's handles stay reachable.    |
| `scripts/floor-mask.test.mjs`                                 | The mask rules, against the mistakes the model makes.            |
| `scripts/patterns.test.mjs`                                   | Every layout tiles; planks keep their real proportions.          |

Everything renders in the browser, including detection. The only network calls
are the model download — which a sample room never needs — catalogue browsing,
and saving or sending, the last two the customer's explicit choice. Good for
privacy and for anyone on a Nigerian mobile connection.

## Mask and quad answer different questions

This distinction is the heart of the design, and conflating the two is what
made an earlier version lay floors across sofas.

- The **mask** is the exact set of floor pixels. It decides _where_ material
  may be drawn, and it is what lets material stop at a chair leg.
- The **quad** is four points on the floor plane. It decides _how_ the material
  recedes, and nothing else.
  A quad alone cannot express "floor, except where the sofa is" — a real floor's
  visible outline is bounded by furniture, not by walls, so fitting lines to that
  outline traces the sofa. A mask alone carries no perspective. Together they are
  sufficient.

### Covering the whole floor

The first thing a customer notices is a floor that is only partly covered, and
it came back in several forms while material was drawn by placing it on the
photograph: a quad that stopped short of the skirting, a reach that ran out, a
horizon that pulled the whole laid area back, a far edge past the last mesh
band. Each had a fix, and the next form was still there.

So the question was turned round. `floor-raster.ts` asks of every photo pixel
_which part of the material lands here_: the inverse homography, then metres,
then the lay angle, then the repeating tile. Asked that way there is nothing to
reach and nothing to run out of. Every pixel has an answer, whatever the quad,
and the mask alone decides the outline. A pixel past the horizon, which no real
floor has but a dragged corner can produce, gets the material's average colour
rather than a hole.

Concretely: the whole frame is filled off-screen, the room's light goes over it,
and a single `destination-in` composite trims the result to the mask before it
reaches the photograph. Without a mask — a floor marked by hand — the quad is
clipped to and does all three jobs, as it must. `coverage.ts` survives only to
stretch the detected quad over its mask, because those corners are the handles
the visitor drags.

Whatever is chosen fills the floor. A rug or mat used to be stamped once in the
middle of the room, which read as a floor that had not worked; only AR still
places one as a thing on a floor.

### Measured

Driving the real page over all four sample rooms: 98.7–100% of floor pixels
change, and under 0.2% of the pixels outside the floor do (the anti-aliased edge).

## Automatic floor detection

SegFormer trained on ADE20K, run in the browser through Transformers.js.
ADE20K has a dedicated floor class, and classes for the stairs, rugs and
furniture the floor has to be told apart from. It is dynamically imported, so
visitors who never reach the visualizer never pay for it, and it stays out of
the initial bundle entirely.

### Two passes, two models

- **Fast — B0, about 4MB.** Small enough to fetch on mobile data; the floor is
  on screen within seconds. Good at floors, weak at what stands on them: on the
  sample living room it called the bottom treads of a floating staircase floor
  at 0.95, and a jute rug a footstool.
- **Precise — B2, about 28MB, three times the work.** It gets both right
  (treads: stairway 0.6–0.75; rug: 0.97). It runs second, in the worker, only
  when the visit can afford it — not on a touch screen, Save-Data, a sub-4G
  connection, under 4GB of device memory or 4 cores
  (`canAffordPreciseDetection`) — and never inline, where its seconds of work
  would freeze the page. Its floor replaces
  the fast one when it lands; corners the visitor has dragged stay put, and
  brush and polygon edits are replayed over the new mask. A chip says
  "Sharpening the floor's edges" meanwhile.

Measured in headless Chrome on a 4-core laptop, excluding the download:
analysis takes about 3s with B0 and 12s with B2.

### Scores, not labels

The stock image-segmentation pipeline was the source of the worst leaks — floor
up the front of a sofa, round the foot of an armchair, over a side table. Two
things it does, both fixed by calling the model directly (`detect-floor.ts`)
and deciding from its raw class scores (`sceneFromLogits` in `floor-mask.ts`):

- **It squashed every photo to 512 square.** A landscape room reached the model
  narrowed by a third, and its decisions were stretched back across the room.
  The model now sees the photo in its own proportions, long side 768, both
  sides multiples of 32. 1024 and 1280 were measured: two to three times the
  time for edges barely better.
- **It decided per class, then scaled the decision up.** Now scores are summed
  into the piles below _before_ deciding — forty per cent sofa and twenty per
  cent armchair is sixty per cent furniture, not a loss to forty-five per cent
  floor — and a pixel is floor only on a majority of the probability, not a
  plurality. The pile scores are scaled up to the photo _before_ being decided,
  so a boundary falls between the model's cells rather than along them.

A depth model (Depth Anything V2 small, ~27MB) was tried for the staircase,
fitting the floor as a plane in disparity and rejecting what stands proud of
it. It caught the upper treads but not the bottom one, which sits too close to
the floor — B2 does better for the same download.

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
ceiling, stairs, door, window, picture, railing, column; **occluders**, the
things that stand on a floor and legitimately hide it — furniture, appliances,
people, plants; and **rugs**, which join one of the others.

A rug is a pile of its own because ADE20K has one class for a fitted carpet and
an area rug, and they want opposite treatment. A fitted carpet is the covering
being replaced; an area rug is something the visitor keeps. Covering rugs was
the old rule, and it left remnants: the model rarely recognises a whole rug, so
the new floor took a bite out of it and the rest stood on top. Now whichever
the photo shows more of is the floor — more rug than hard floor is a carpeted
room and the rug joins the floor; otherwise rugs are occluders and keep their
own surface.

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

What is left is that the model has to say what a thing is. Area rugs keep
their own surface whatever it calls them, which is what happens on RoomVo too.

The floor is also stood back a couple of pixels from anything structural, and
from nothing else. The asymmetry is the point: a hairline of the old floor along
a skirting board is invisible, material a hairline up the wall is the first
thing anyone sees, and at a chair leg the floor genuinely does continue to the
edge of the object.

From the model's per-pixel labels:

1. Class scores are summed into the piles and decided at the photo's size (see
   "Scores, not labels"). Labels are matched token by token, because the same
   checkpoint is published with both short names (`rug`) and ADE20K's full
   synonym lists (`rug;carpet;carpeting`); missing a class here loses a whole
   area of floor.
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
   reliably: how far up the photograph the floor reaches, which places the
   horizon, and roughly where it recedes to. The near edge spans the floor's
   width at the bottom of frame, and its sides run to a point on the horizon.
4. That quad is then stretched along its own plane to fit the floor, and pulled
   back inside the photograph, because these four corners carry the drag
   handles, and a handle out in the margins is a handle nobody can reach.
   Coverage does not depend on the result: the renderer asks every floor pixel
   for its material, whatever quad it is given.

Step 3 deserves its scars. Fitting straight lines to the mask's left and right
boundaries seems obvious and is wrong: on a real room it latches onto a sliver
of floor past a staircase and skews the whole quad. Taking the narrowing from
the floor's _extent_ is steadier but understates perspective badly: a floor
running out of frame on both sides does not visibly narrow, and the sample lobby
got a horizon above the top of the photograph. Parallel lines on a floor meet on
the horizon, and a phone held level at chest height puts the far wall's foot
about a sixth of the frame below it, so that is what sets the perspective now.
The far rows only lean it left or right, by half what they show, because
furniture hides one side of them.

### A sample room needs no model

A sample room is the same photograph for everyone, so `bake-sample-floors.mjs`
runs the precise pass once and ships the result: a two-colour PNG of 1–4KB and
four corners. Those floors are the first anyone sees, so the script also applies
`TOUCH_UPS`, polygons drawn by hand against a gridded zoom of the photo. Opening
the studio therefore fetches no model at all; `useFloorDetection` reads the
preset and falls back to the model only if it will not load.

### Off the main thread

Detection used to run on the main thread, and on a modest PC the page — and
the browser with it — froze for seconds at a time: the model's inference, then
the pipeline upsampling all 150 class maps to the photograph's full size in
JavaScript, then the mask passes. Now:

- **A Web Worker does all of it** (`detect-floor.worker.ts`). The main thread
  only reads the photo into two small buffers (`floor-detector.ts`) and hands
  them over. Measured on a production build: after the first render the main
  thread is idle throughout download and analysis.
- **The model sees a 768px copy in the photo's own proportions,** and only
  three pile scores — not 150 class maps — are scaled up, to the 1280px copy
  the refinement step snaps the boundary against.
- **It starts when the browser is idle**, after the room and material have
  painted, and its progress is throttled to a few updates a second — every
  update re-renders the studio.
- **The ONNX runtime is self-hosted.** Transformers.js fetched a 23MB build
  from a public CDN that the browser refused to cache, so it downloaded again on
  every visit. `scripts/vendor-ort.mjs` (run before `dev` and `build`) copies
  the plain 13MB SIMD build — the one Safari already used; the larger build only
  matters for WebGPU — into a folder named for its version, served with a
  one-year immutable cache header. If the copy is missing the CDN is used.
- **Nothing named `use…` that is not a hook.** React Fast Refresh instruments
  any `use`-prefixed call as a hook; inside a worker its runtime does not exist
  and detection failed with `_s(...) is not a function` in development.

The model weights (about 4MB, and 28MB for the precise pass) still come from
Hugging Face. SegFormer's
weights are published under NVIDIA's SegFormer licence; check it permits this
use before relying on it commercially, and before hosting the weights here.

### Loading, shown

Nothing is laid while a room's floor is unknown: the only thing to lay it on
would be a guessed trapezoid, and a patch in the middle of a room reads as a
broken render. The room stays on show with a chip in its corner reporting the
download, and "Mark it by hand" gives the visitor the corners at once. If
detection fails, the notice under the stage offers the same.

A new floor keeps the old one on show until its image has landed, then dissolves
in (`fadeFrom` in `RoomStage`). An image and its material are only ever swapped
together, because baked tiles are cached by material: pairing the old image with
the new material baked the old floor under the new floor's name, and it stayed
on screen after the real image arrived. That was the bug behind "selecting a
floor does nothing". A floor whose image will not load goes back to the last one
shown, says so, and is taken out of the list.

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

### Snapping to the skirting line

The colour vote fixes a pixel or two of wander. At walls the model's error is
far larger — a 5–40px strip of old floor along every skirting board and a
wedge missing at the foot of a column — and the vote cannot close it, because
it may not turn anything the model called wall into floor.

`snap-to-edges.ts` re-decides a band either side of each floor/wall junction
(2% of the photo's width) and each junction with solid furniture (1%) by a
marker-controlled watershed over the photo's edge strength. Pixels deep inside
the floor and deep inside the wall are markers; the band is flooded from both,
weakest edges first, and the floods meet on the strongest edge between them —
the skirting line, not a plank seam. Thin parts of furniture (chair legs) are
left as the model drew them, since a band would leave them no inside and the
floor would flood over them; the furniture band is narrower than the wall band
because a dark leg in its own shadow has barely an edge against the floor.

With the junction on the real edge, the floor's pull-back from walls is 1px;
at 2px it left a visible line of old floor along every wall. Edge strength is
computed only inside the bands, which keeps the step to about half a second.

The join is then cleaned up in `cleanFloorMask`. Each column ending at a wall
takes the median of its neighbours' far edge, and a wide blur rounds off steep
joins, both beside structure only: a skirting line is straight, but a chair leg
is thinner than the blur.

The mask is composited with smoothing on. It is smaller than the photograph, and
a hard scale steps every edge in it.

### Around and under furniture: colour decides

Under a table the model's ~7px cells are coarser than everything there: chrome
legs are ~5px wide and the floor between them comes in pockets. Its scores are
no guide (shaded floor under a table: "swivel chair" 0.85–0.97; chrome legs:
floor 0.8–1.0). `settle-furniture.ts` re-decides a band (4% of width) around
each floor/furniture junction by colour:

- Floor colours are learned over the whole photo, but only where the model is
  ≥90% sure; furniture colours piece by piece (each connected group), only
  where the model gives floor ≤2%. Learning from the model's own mistakes made
  the mistakes look right — shaded floor taught as "chair" stayed chair.
- Colours are binned as brightness-normalised ratios, so shaded wood stays warm
  and grey stays neutral; brightness is binned coarsely.
- A pixel changes hands only if one side is 4× likelier. Very dark pixels are
  left to the model, and changes forming tiny patches are undone — both
  pocked shadows with holes otherwise.

Still beyond it: wood furniture over a wood floor (a tabletop's shade matches
the floor's), which the model's answer decides. Tap-to-fix covers the rest.

### Smart select: tap to fix

Floor area → **Smart select**, with the same Add floor / Remove modes as the
brush. The visitor taps a patch the floor missed, or something it covered, and
Segment Anything (SlimSAM, ~14MB, `Xenova/slimsam-77-uniform`) selects that
surface to its edges.

- `smart-select.ts` runs in `smart-select.worker.ts`; `smart-selector.ts` is the
  main-thread client. No inline fallback: without a worker the brush and
  polygon tools remain.
- The photo is read once (encoder, the slow half) when the tool is chosen,
  and the decoder is warmed with a dummy point then. Each tap is the decoder
  alone, with the point tensor built by hand (the processor would re-process the
  whole photo) and only the chosen mask upscaled (the library upscales all
  three).
- SAM's 256² mask edges are snapped to the photo with the same colour vote as
  detection (`refineMask`).
- Results are `area` mask edits: run-length bitmaps (`area-runs.ts`), replayed
  like every other edit, so Undo, saving and sharing work unchanged. Saved
  areas are validated before drawing.

Measured in headless Chrome on a 4-core laptop: reading a photo ~60s including
the first download, then a few seconds per tap. Real browsers cache the model.

## Visualizer textures (the admin tool)

A product's visualizer texture is its own image — a square, straightened,
evenly lit, seamless picture of the material — stored in the
`visualizer_texture` media collection, never shown on the product page, and
used only here. Catalogue staff prepare them at `/admin/visualizer-textures`
(roles with `media.update`: super admin, catalogue manager):

1. Choose a product, and a colour if colours need their own texture.
2. Pick any of its photos, or upload a better one.
3. Drag four corners onto a square patch of the material — a tile, or a square
   of planks. The patch is straightened by the same homography the renderer
   uses (`texture-prep.ts`), its lighting evened out (divided by its own
   heavily blurred brightness), and its edges cross-faded with what lies past
   the opposite edge so it repeats without a seam. A 3 × 3 preview shows it.
4. Give the square's real size in metres. Saved as `size_m`, and the visualizer
   lays the texture at that scale — in the natural layout, and when cutting
   planks, which are now filled from the seamless texture at its real scale
   rather than stretched from one sample.

The API (`/v1/admin/products/{slug}/visualizer-texture`) replaces any previous
texture, and the Next.js proxy refreshes the catalogue cache so the visualizer
uses the new texture immediately.

The first catalogue import copied every hero photo into this collection as a
placeholder. A copy (same `source` as the hero) is ignored — it is not a
texture, and treating it as one would cut marketing photos into planks — and
`php artisan catalog:prune-visualizer-copies` deletes them.

## Textures and patterns

A product texture is either a **dedicated seamless asset** uploaded to the
`visualizer_texture` media collection, or the marketing photograph standing in
for one. The API says which (`visualizer_texture_is_dedicated`).

Catalogue photography is staged: a tile cut out on white, a vase on a plank, a
deck beside a swimming pool. Repeating that lays the photograph across the floor,
backdrop and props included. So a photograph is reduced to the material first
(`material-patch.ts`, `materialFromPhoto`):

1. On a 96px copy, discount the white backdrop reachable from the frame, take the
   weighted median colour of the lower middle of the shot, mark everything near
   it, and find the largest rectangle of marked cells.
2. Even out its light and cross-fade its edges (`texture-prep.ts`, the same steps
   as the admin tool), so no seam or lit side repeats.

It finds a clean patch in most of the catalogue. It fails on shots with no large
run of one surface — a playground, a multicoloured stack of samples — which is
the case for a dedicated texture. Those still give the best result by far.

Every material now defaults to its real layout: planks staggered, tiles in a
grid, at the product's size. Cutting the old centre-crops into planks repeated
their props, which is why photographs used to default to "as photographed"; cut
from a clean patch they read as a floor, and a repeated photograph does not.

Products that are not floors (wall panels, trims, fixings) are left out of the
studio by `floorChoices`; a direct link to one still opens it.

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

Bakes are sized to the floor underfoot (bucketed by powers of √2 and cached),
and mipmaps and anisotropic filtering look after the far end, so a joint stays
crisp near the camera without shimmering across the room.

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

With depth known, the plane is laid **in metres**, and planks are drawn at the
variation's real millimetres against the quad's width. That width used to be a
flat 4m for every room. `floorWidthFromCamera` now works it out: with the camera
intrinsics removed the columns are λ·A·r₁, λ·B·r₂, λ·t, so the floor's normal is
r₁ × r₂, the camera's height above it is |n·t| in the quad's units, and assuming
a phone at 1.4m gives A in metres. It is tested against a synthetic camera, and
the "floor width" slider overrides it.

### Light

Multiplying the raw photograph back over the material carried the _old floor_
with it: a dark floor darkened the new one, a red tile tinted it, and highlights
were lost because a multiply can only darken. `lighting.ts` divides each pixel's
blurred luminance by the floor's average. Below 1 is colourless shading centred
on the floor's own exposure, multiplied; above 1 is highlight, screened in
proportion to the finish (matte, satin, gloss). The blur takes out the old
floor's grain, grout and parquet pattern, which are texture, not light. Computed
once per photo and floor area. A polished floor mirrors what stands on it, and a
reflection measures exactly like a shadow, so only 68% of the depth is kept:
enough to ground the furniture without printing dark columns across a matt floor.
"Room lighting" turns it down further.

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

### Drawing it

`setTransform` on a 2D canvas is affine and cannot divide by `w`, so the material
is mapped in a fragment shader (`floor-raster.ts`). The inverse homography, the
laying in metres, the lay angle and the tile's size multiply into one 3×3 matrix,
so the shader is a matrix multiply and a divide. It is normalised so the divisor
is +1 in the middle of the quad; a homography's sign depends on the quad's
winding, and "in front of the horizon" only means something once it is fixed.

The WebGL canvas is only ever a source: the result is drawn straight onto the 2D
canvas in the same task, so `preserveDrawingBuffer` is not needed, and light,
mask, comparison and export are all plain 2D compositing as before.

This reverses an earlier decision to stay on a 2D canvas for mid-range phones,
drawing a mesh of affine cells. That needed a domain, depth bands, seam bleeds
and cell budgets, each to patch a gap the last one left. Per pixel it needs none
of them, a phone GPU does it in a frame or two, and the far floor is filtered
properly for the first time. The file is smaller than the mesh it replaced.

Where WebGL2 is missing, or its context is lost, `rasterise` does the same
arithmetic in JavaScript at up to 1280px, choosing a mip level per pixel. It is
softer at the far end, and it is pure, so the coverage guarantee is tested on it
directly. After two lost contexts the GPU is left alone for the visit.

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

Coverage has a suite of its own — `npm run test:visualizer` — because "the floor
is not all covered" is the failure a customer reports first. `floor-raster.test`
renders through `rasterise` and asserts **every pixel of the photograph receives
material**, for a floor in the lower half, a tiny quad far from most of the floor,
a camera turned hard to one side, a horizon inside the frame, and corners dragged
out of order.

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
viewing. The quad is restored as saved, detection or the sample's preset supplies
the mask again, and the edits replay on top. Edits are kept as normalised operations, not pixels,
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

B2 behind a capability check is now the precise pass. If detection quality
needs to improve again, the next lever is a still larger SegFormer (B4/B5) on
the same terms, rather than post-processing the mask harder. The floor under a
table, between chair bases, is the case both models still leave on its old
covering.
