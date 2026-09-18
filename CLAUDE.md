# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page portfolio built around one interactive 3D object: a Game Boy-shaped
hardware controller ("HiChord"). Pressing its **projects** key opens a carousel of
cartridges; picking one flies it into the device's slot, and a projector throws a
scrolling screenshot of that project onto a plane above the device.

Its **photography** key opens a second scene: a wall of prints hung in 3D, packed
from their aspect ratios, panned by drag or trackpad, with any print clickable to
fly it to full frame.

There is no router and no backend. The whole experience is one WebGL canvas plus a
DOM overlay.

## Commands

```bash
npm run dev              # Vite dev server on :5173 — has the debug hooks below
npm run build            # prebuild re-optimises the models, then Vite builds
npm run preview          # serve dist/ on :4173 — the only honest perf target
npm run lint             # oxlint
npm test                 # vitest, once
npm run test:watch       # vitest, watching
npm run coverage         # vitest with coverage, enforcing the thresholds
npm run ci               # lint, coverage and build — what CI and the deploy run

npm run optimize:models  # regenerate src/assets/glb/*.glb from glb/original/
npm run previews         # re-screenshot project sites (needs extra installs, see below)
npm run photos           # rebuild the photography wall from src/assets/photography/
```

Tests cover the logic that decides what the scene should do; the drawing itself is
verified by driving the running scene and measuring it — see **Verifying changes**
and **What the tests cover** below.

`npm run previews` needs Playwright, which is deliberately not installed because the
browser download is large and previews only change when a project's site changes:
`npm i -D playwright && npx playwright install chromium`. (sharp, which both scripts
use, is already a devDependency.)

## Architecture

### The state machine is the spine

Everything — camera framing, which meshes exist, what the overlay says, whether the
projector runs — is derived from one mode in `src/scene/useDeviceStore.js` (zustand):

```
IDLE ──openCarousel──> BROWSING ──insert──> INSERTING ──seated──> PROJECTING
        <──closeCarousel──┘                                            │
                          └<─────── ejected ──── EJECTING <──eject─────┘
```

Two rules matter when adding behaviour:

- **Animations report completion; they are not timed from outside.** `seated()` and
  `ejected()` are called by the animation that finished, not by a `setTimeout`. A
  slow machine must not advance the mode before the cartridge has arrived.
- **Every transition guards on the current mode** and returns early if it does not
  match, so an interrupted transition is abandoned rather than fighting its
  successor. Keep that pattern in any new action.

`insert()` while already `PROJECTING` sets `pendingIndex` and ejects first; `ejected()`
then picks the pending one up. That is how switching projects mid-projection works.

The photography key runs a second, parallel arm of the same machine:

```
IDLE ──openGallery──> OPENING_GALLERY ──galleryOpened──> GALLERY
  <──galleryClosed── CLOSING_GALLERY <──closeGallery──────┘
```

The two transitional modes are not decoration. The wall has **its own camera**, and
swapping which camera is default is a cut rather than a glide — so **both cuts are
arranged to land on an empty frame of one colour that the desk and the wall share**,
and nothing is ever seen changing.

`OPENING_GALLERY` is the beat where the device fades out and the stage dims
together, while the wall — mounted but five metres behind and out of frame — gets
its textures on the wire. The device's fade calls `galleryOpened()`, so the camera
cannot change hands while the desk is still on screen; the prints then come up into
the empty frame. `CLOSING_GALLERY` is the reverse: the prints clear with the camera
still on the wall, then it hands back to a desk that is still faded out, and the
device and the room come up together on `IDLE`.

**The wall renders on its own layer (`GALLERY_LAYER`), and only the gallery camera
enables it.** This is load-bearing, not tidiness. The backdrop has to stay filled at
any pan of a wall that grows without limit, so it is a very large plane — and a
plane that size hanging five metres behind the device is squarely inside the device
camera's frustum however far off-axis its centre sits. Before the layer existed it
blacked out the whole desk scene the instant the wall mounted, while the device was
still fading and the page was still light: that was the "screen turns dark" glitch.
Sizing the plane to stay out of frame would have to be re-derived whenever the wall
or viewport changed, and being wrong by a little brings the whole failure back. The
wall's two lights sit on the layer too, which is also what keeps them off the device.

**A layer hides things from the pointer as well as from a camera.** A `Raycaster`
tests layer 0 and nothing else unless told otherwise, so moving the wall onto its
own layer silently took every print out of reach of a click — no error, the prints
simply stopped responding. `Gallery.jsx` enables `GALLERY_LAYER` on R3F's raycaster
while the wall is mounted and disables it on the way out. Anything else put on a
layer needs the same, and the failure will look like a dead mesh rather than a
layer problem.

Three values then have to agree so the cut itself is invisible: the stage dim
(`700ms` on `.stage` in `index.css`), the device fade (`DEVICE_FADE_SECONDS` in
`Device.jsx`), and the backdrop colour (`BACKDROP` in `Gallery.jsx`, which must equal
`--stage-bg` of `.stage--dark`). The backdrop is **unlit and `toneMapped={false}`**
for the last of those — a lit material comes out of the tone mapper some way off its
authored value, and any gap between it and the page behind the canvas shows as a
flash at the moment the cameras swap.

`Device.jsx` owns that fade and publishes it through `scene/deviceFade.js`, which
`LightingSetup.jsx` reads so the contact shadow leaves the desk with the device
rather than staying printed on it. It is a **linear ramp, not the exponential damp
the camera uses**, because it ends by restoring every material's authored
`transparent` flag: an asymptotic approach never satisfies its own end condition, so
a loop that stops early would strand the device a fraction short of opaque and
permanently sorted as transparent geometry.

Mode guards in the scene are **whitelists**. `Carousel.jsx` used to ask for "not
IDLE", which silently meant the cartridge strip also rendered through the gallery
modes — invisible while the wall's camera was up, then flashing into shot the moment
the camera came back to the desk.

### Who owns what

| Concern | File |
|---|---|
| Canvas, renderer flags, debug hooks, shader warm-up | `src/scene/Stage.jsx` |
| Device model, all cameras, keys, intro playback | `src/scene/Device.jsx` |
| Cartridge strip layout and per-slot poses | `src/scene/Carousel.jsx` |
| One cartridge instance (mesh clone, materials, label) | `src/scene/Cartridge.jsx` |
| The cartridge that flies into the slot | `src/scene/ActiveCartridge.jsx` |
| Beam, preview plane, boot beat, spill light | `src/scene/Projector.jsx` |
| Beam and preview GLSL | `src/scene/projectorShaders.js` |
| All sound, synthesised at runtime | `src/scene/audio.js` |
| Lights and environment | `src/components/LightingSetup.jsx` |
| DOM overlay: arrows, description, keyboard | `src/components/Overlay.jsx` |
| Project catalogue | `src/data/projects.js` |
| Photography wall, culling, focus | `src/scene/Gallery.jsx` |
| One print (mesh, textures, springs) | `src/scene/Print.jsx` |
| Wall packing, camera distance, pan bounds | `src/scene/galleryLayout.js` |
| Gallery camera and its pan input | `src/scene/GalleryCamera.jsx` |
| Photo texture caches (thumb + full) | `src/scene/usePhotoTexture.js` |
| Photo catalogue | `src/data/photos.js` (+ generated `photos.generated.js`) |
| Device fade, shared with its shadows | `src/scene/deviceFade.js` |

Unused, kept only as history — do not extend, and check before assuming it runs:
`src/components/DeviceModel.jsx` (superseded by `scene/Device.jsx`) and
`src/scene/insertionPath.js` (superseded by the stage machine inside
`ActiveCartridge.jsx`). Neither is imported anywhere.

### Scene conventions

- **Real-world scale, in metres.** The device is 92 × 98 × 15 mm, so a keycap is
  `0.008` tall and the camera's near plane is `0.001`. A near plane of `0.1` clips
  the entire model — this is the classic mistake here.
- **The device never moves or rotates.** Every "the device slid down" effect is the
  camera changing pose. There are three: rest, open, and projecting, all in
  `Device.jsx`.
- **The open camera looks almost straight down**, which makes both `lookAt`'s roll and
  spherical azimuth degenerate. The up vector is therefore steered explicitly
  (world `+Y` at rest, world `-Z` when open) and the return home eases position
  directly. **Never reintroduce spherical interpolation for the camera** — it sends
  the view around the far side and lands it upside down.
- In the open view, **screen-up is world `-Z`** — the edge carrying the slot and lens.
- **The photography wall is somewhere else, not something the device becomes.** It
  hangs at `WALL_Z = -5`, five metres behind the device, with its own camera. That is
  how the gallery honours the rule above: nothing has to be animated out of the way,
  and no interrupted transition can leave the device half-moved. The wall grows
  downward from `y = 0`, so its coordinates are negative; a print is 300 mm across.
- **Two cameras, and they must not touch each other's.** The device needs a 1 mm near
  plane for a 92 mm object; the wall is metres away. Which one is default is switched
  by `makeDefault`, so anything that writes to `state.camera` has to be guarded on the
  mode — see the `inGallery` guards in `Device.jsx`.

## Common changes

### Add a project

Append to `PROJECTS` in `src/data/projects.js` (`id`, `title`, `subtitle`, `color`,
`inkColor`, `preview`, `url`), drop a tall screenshot at `public/previews/<id>.webp`
or run `npm run previews`, and stop. Carousel spacing, fan, focus wrapping and the
overlay all read the array length; nothing else needs editing.

### Add a photo

Drop it in `src/assets/photography/` and run `npm run photos`. That writes both
sizes into `public/photos/` and regenerates `src/data/photos.generated.js`. Those
originals are only ever read by that script — nothing imports them, so Vite never
bundles them; what ships is what the script writes into `public/photos/`. Captions
live separately, in the `META` map in `src/data/photos.js` keyed by the filename
stem, so re-running the script never overwrites anything written by hand, and a
photo with no entry there simply shows no caption.

The originals are full-resolution and heavy — the current twenty come to about
70 MB, one of them 28 MB alone, against 4.5 MB of generated output that actually
ships. Whether they belong in git is a judgement call; nothing at runtime needs
them.

**`npm run photos` is not part of `npm run build`.** The model optimiser runs on
every build, so a stale model cannot ship; the photo manifest has no such
protection, and a photo added without running the script simply will not be on the
wall. It is left out of the build on purpose — re-encoding every original on every
build would be slow, and the originals change far less often than the code.

Files are ordered numerically, not lexically, so `img2` comes before `img10`. That
order is what the masonry pack consumes, so it decides where each photo hangs.

Nothing else needs editing: the masonry pack, the pan bounds and the wall's height
are all derived from the manifest. `aspect` is measured at build time on purpose —
column heights depend on every earlier photo's aspect, so measuring at runtime
could not place anything until all the images had partly loaded, and each late
arrival would reflow the wall under the pointer.

Depth and tilt come from an FNV-1a hash of the id, not from `Math.random`, so a
photo hangs in the same place in every session and every build. Two independent
streams are pulled from that hash: sharing one would correlate depth with tilt, and
a wall where everything deeper also leans the same way reads as a pattern.

### Change the 3D models

Edit `src/assets/glb/original/*.glb` — **never the files beside them**, which are
generated. Then `npm run optimize:models`. It runs on every build anyway, so a stale
optimised model cannot ship.

The optimiser resizes textures and compresses geometry with meshopt (chosen over
Draco because drei already bundles a meshopt decoder, so it costs no extra request).
Two `prune` options are load-bearing and must stay:

- `keepAttributes: true` — the cartridge label, text, contacts and foil carry no
  texture *in the file*; artwork is assigned at runtime. Without this their UVs are
  pruned as unused and **the cartridge labels render blank**.
- `keepLeaves: true` — keeps the `SlotAnchor` and `LensAnchor` empties.

### Touch a device key or its annotation

Keys are `DeviceButton` in `src/scene/Device.jsx`, not part of the DOM overlay. Each
one hovers up, presses down, and — where it has a `description` — draws a leader line
and label through a drei `<Html>`.

Two things about that annotation are load-bearing. It is dismissed **without
animating** when the key is clicked (`dismissed` state), because retracting it plays
the leader line backwards over 1.5 s, which sends a hairline sweeping some four
hundred pixels across the screen at the exact moment of a click and reads as a
glitch. Leaving with the pointer still retracts normally, which is where that
animation belongs — the pointer is on its way out anyway. And the label's colour is
mirrored from `--stage-ink` by hand, so it follows the room lights down with
everything else.

### Add a sound

Add a function to `src/scene/audio.js` and call it from the animation stage that
should trigger it. Everything is synthesised from oscillators and noise buffers; no
audio files ship. One `AudioContext` serves the whole app — browsers cap how many a
page may hold, so do not create another. Levels there are set against what survives
the filter, not the raw noise, and were chosen by metering.

### Touch the overlay

`src/components/Overlay.jsx` for markup and keyboard, `src/index.css` for styling.
The overlay re-themes with the scene through `--stage-*` custom properties on the
wrapper in `App.jsx`: light at rest, dim while browsing, darker while projecting.
Read those variables rather than hard-coding colours, or the element will not follow
the room lights down.

Because the description sits directly on the stage with no panel behind it, it waits
out the 700 ms background transition before fading in. Appearing sooner puts light
text on a still-light background.

## Performance constraints worth knowing

- **Shaders must be compiled before they are needed.** Every cartridge material
  reaches the scene in the single frame the carousel opens, and linking them there
  stalls the transition by most of a second. `Stage.jsx` draws one cartridge out of
  shot once the intro ends to force that linking while nothing is moving. The wall
  does the same thing by a different route: it is mounted but on its own layer, so
  nothing would link it until the cut, and `Gallery.jsx` calls
  `gl.compileAsync(scene, galleryCamera)` during `OPENING_GALLERY` instead. It must
  be compiled against *that* camera — the wall and its lights are on a layer the
  device camera cannot see, so compiling against the device camera links a program
  for a scene with no lights in it and the real one is still linked at the cut.
  Measured: 22 programs now link during the opening beat rather than in the cut
  frame. If you add materials that first appear mid-transition, warm them one of
  these two ways.
- **Loading an image is not uploading it.** three defers the upload to the first
  frame that draws the texture, which for both transitions is the worst possible
  frame — fifteen thumbnails, or three full-height cartridge labels, uploading and
  building mipmaps while the camera is mid-glide. Both call `gl.initTexture()` the
  moment the image decodes, which spreads the same work over the beat before the
  cut. `usePhotoTexture.js` takes the renderer through `setPhotoRenderer()` for
  this; `Cartridge.jsx` reads it from `useThree`.
- **Preview textures are the memory cost.** A tall screenshot is several megabytes
  of VRAM decoded, so `usePreviewTexture.js` loads one only while its cartridge is
  live and disposes it on eject. It hands the texture back **only while its url still
  matches the one being asked for**: on a direct swap between projects the url changes
  a render before the new texture arrives, and returning the outgoing one would let
  the renderer re-upload it after disposal, stranding a GPU texture nothing owns.
  Keep that url check if you touch the hook.
- **The photography wall is the other memory cost, and a larger one.** An 800 px
  thumbnail is a few megabytes of VRAM decoded, so a wall of two hundred would be
  hundreds of megabytes if all were resident. `usePhotoTexture.js` holds two
  reference-counted stores: thumbnails, kept while a print is in frame and dropped
  after a grace period so panning across an edge does not reflicker a column; and
  full-resolution images, capped at three by least-recently-used so stepping back
  through recent photos is instant. Leaving the gallery clears both — the cap
  exists for a visitor still in the room.
- **Wanting a texture is not the same as fetching one.** Three things sit between
  them, and together they are why the wall does not ask for everything at once:
  a **settle delay**, so a print only skimmed past is never requested; a **bounded
  queue** (four at a time, nearest the middle of the view first), so opening the
  gallery fills in from the centre outwards instead of firing a dozen requests
  that all arrive late — the pump is coalesced into a microtask so that a whole
  frame's worth of newly-visible prints is considered together, without which the
  four slots go to whichever settled first, which is array order and not priority; and a **pan-speed gate** — `Gallery.jsx` calls
  `thumbStore.setPaused()` above `PAN_SETTLE_SPEED`, so flicking the length of the
  wall queues rows and drops them unfetched, and images arrive for wherever the
  pan comes to rest. A focused print passes `IMMEDIATE` and skips all of it: it is
  the one image the viewer is actually waiting on.
- **The pan limits stop at the pictures, not past them.** `PAN_PADDING` is one
  `GAP` — the same spacing that sits between prints — so the edge of the wall reads
  as the layout breathing. It was half a column pitch, which is a quarter of the
  screen height: panning to the bottom then put an empty band under every column at
  once, and the same above, and the wall appeared to have ended well before its last
  row. Note the bottom edge is still *ragged*, because masonry columns rarely end
  level — with the current twenty they differ by about 0.3 m. That is the layout,
  not a bug; packing tallest-first would cut it to about 0.06 m at the cost of file
  order no longer deciding where a photo hangs.
- **`MARGIN` is deliberately narrow** (a little over half a print). It is not zero
  because a print that loads only once its edge appears arrives visibly late, but
  the queue is what buys smoothness now, not a wide margin.
- **Culling is rectangle overlap, not `THREE.Frustum`.** The wall is flat and
  viewed head-on, so the frame is a rectangle in wall coordinates and two
  comparisons answer the question. A frustum test would build a `Frustum` and a
  `Matrix4` per print per frame. The visible set is recomputed every frame but only
  *allocated* when membership actually changes, so panning within a row does not
  re-render the wall.
- **The wall reads the pan target, not the camera.** It has to decide what to load
  before its camera is the one being rendered, and reading the target also loads
  slightly ahead of the view rather than behind it.
- **Nothing else may bind the gallery camera.** three's `OrbitControls` calls
  `update()` from its constructor, and drei rebuilds the controls whenever the
  default camera changes — so merely *disabling* them still let them seize the
  wall's camera and aim it back at the device. They are unmounted in gallery modes,
  and `Device.jsx` guards every line that writes to `state.camera` on `inGallery`
  for the same reason.
- **Every exponential ease must clamp its frame delta.** `MathUtils.damp(a, b, k, dt)`
  resolves `1 - e^(-k·dt)` of the remaining distance, so one long frame resolves
  almost all of it and the move reads as a jump. `Device.jsx` caps the camera with
  `MAX_EASE_STEP`; `LightingSetup.jsx` caps all five of its light eases with
  `MAX_LIGHT_STEP`. The lighting went uncapped for a while and it was visible: the
  frame in which the carousel opens also links every cartridge shader, and it was
  measured taking the exposure its **entire** travel — 1.15 → 0.75 — in that single
  frame, which reads as the room glitching at the moment of the click. Both caps are
  0.1 s, loose enough that anything down to ten frames a second passes through
  untouched; only a pathological frame is damped.
- The models are preloaded from `index.html` by a small plugin in `vite.config.js`,
  using `crossorigin` that matches how three fetches them. Mismatch it and the
  browser downloads every model twice.

## Continuous integration

`.github/workflows/ci.yml` runs `lint`, `coverage` and `build` on every push to
main and every pull request. `npm run ci` is the same three in one command, which
is what a deploy's build step should run so that a red test stops a release.

**It does not deploy, and it is not what protects production.** Cloudflare Workers
Builds publishes this repo from its own build, so only a failure *there* stops a
release — which is why its build command must be `npm run ci` and not
`npm run build`. This workflow exists for the pull request: it is the check to
require in branch protection, and it names which stage broke rather than burying
it in a deploy log. If deployment ever moves here, Workers Builds has to be turned
off in the same change or the two will race.

Note there is no `wrangler` config committed, so the deploy itself is not
reproducible from this repo — it lives in the Cloudflare dashboard.

Two things this repo needs from any build machine:

- **devDependencies are required to build, not merely to test.** `prebuild` runs
  the model optimiser through `@gltf-transform`. A build with `NODE_ENV=production`
  skips them and fails in a way that looks nothing like its cause.
- **Node comes from `.nvmrc`**, so the runner cannot drift from what the deploy
  uses.

## What the tests cover

`npm test` runs Vitest over the modules that hold the rules: the state machine, the
wall's layout arithmetic, the texture stores' loading and eviction policy, the
preview texture hook, and the DOM overlay. `npm run coverage` enforces 90% across
statements, branches, functions and lines for exactly those files — the list is in
`vitest.config.js`, and it is scoped on purpose.

This is also the shape of bug the unit tests cannot see: click-to-focus broke on a
raycaster layer mask, which lives entirely in R3F's event system. It was found by
clicking a print in a real browser and reading `focusedPhotoId` back.

**What is deliberately not unit-tested, and why.** Roughly two thirds of this
codebase draws. `Device`, `Gallery`, `Print`, `Projector`, `Cartridge` and their
neighbours are react-three-fiber components whose behaviour *is* a camera pose, a
shader program, a layer mask or a texture upload. A jsdom mock of WebGL would only
assert that the mock was called, and it would keep passing through exactly the
failures this scene actually suffers — a camera seized by `OrbitControls`, a
backdrop inside the wrong frustum, an ease that jumps on a long frame. Those are
caught by driving the real thing, which is what **Verifying changes** is for. Adding
them to the coverage list would raise a number and lower the signal.

Two things to know when writing more:

- **The texture stores are module-level singletons** holding a shared in-flight
  counter and an eviction list. Tests take a fresh module per case
  (`vi.resetModules()` then re-import) rather than trying to unwind each other's
  state; anything less leaks, because a load left in flight never releases its slot
  and the concurrency cap then starves every test after it.
- **Loads start a microtask after they are queued**, so a test that advances timers
  must also let microtasks run before asserting that a fetch began.

## Verifying changes

Screenshots alone are not enough here, and aggregate pixel diffs have produced false
"no change" results — a blank cartridge label is under 1% of the frame, which is
below the run-to-run noise of the idle animations. Look at the image *and* measure
the specific thing.

The dev build exposes hooks for this: `window.deviceStore` drives the state machine
without synthesising clicks, plus `__scene`, `__camera`, `__gl` (texture counts) and
`__audioBus` (metering). The gallery adds `__gallery` (layout, pan target, visible
set, bounds) and `__photoTextures` (`thumbStore.stats()` / `fullStore.stats()`), which
are how you check that off-screen prints are not resident and that switching focus
quickly does not strand a texture.

If you drive a headless browser, note that software rendering runs a few frames per
second. Frame-time numbers from it are noise, and CSS transitions lag behind
wall-clock, which reads as a broken theme. CPU profiles remain trustworthy for
attribution, and audio must be metered on the audio thread via an `AudioWorklet` —
sampling on the main thread misses short sounds entirely.

Three traps in that harness, each of which has already produced a confident wrong
answer:

- **A headless page renders only when something forces it to.** Left alone it stops
  producing frames entirely, and every frame-driven value freezes with it — a fade
  stuck mid-way, a mode that never advances, `info.render.frame` flat for seconds.
  None of that is a bug in the scene. `Page.captureScreenshot` forces one frame, so
  a burst of screenshots gives frames that are *seconds* apart: useless for catching
  a transient. Use `Page.startScreencast` to record the compositor's own frames when
  you need to see a one-frame artefact.
- **Launch with `--disable-background-timer-throttling`,
  `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding`.**
  Without them `setTimeout` is throttled hard: a 320 ms transition timer was still
  unfired 22 s later, which looks exactly like a stuck state machine.
- **Read state and pixels at the same instant, or not at all.** Sampling
  `getComputedStyle` before a screenshot and comparing the two is meaningless here,
  because seconds of wall-clock pass between them. Prefer a timing-free test where
  one exists — a frustum intersection, a layer mask, a store's own counters — over
  anything that depends on when a frame happened to land.

## House rules

`agent.md` holds the user's standing preferences. The parts that still apply:
Tailwind utilities over custom CSS, Remix Icon for iconography **if icons are ever
added** (the dependency was removed as unused), viewport background `#faf9f6`,
mobile-first and responsive, no dead code, and comments that explain *why*.

Its "File Structure" section describes an older layout (`src/styles/`, `src/utils/`)
that does not exist; the table above is current.
