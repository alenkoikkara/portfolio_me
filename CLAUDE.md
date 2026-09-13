# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page portfolio built around one interactive 3D object: a Game Boy-shaped
hardware controller ("HiChord"). Pressing its **projects** key opens a carousel of
cartridges; picking one flies it into the device's slot, and a projector throws a
scrolling screenshot of that project onto a plane above the device.

There is no router and no backend. The whole experience is one WebGL canvas plus a
DOM overlay.

## Commands

```bash
npm run dev              # Vite dev server on :5173 — has the debug hooks below
npm run build            # prebuild re-optimises the models, then Vite builds
npm run preview          # serve dist/ on :4173 — the only honest perf target
npm run lint             # oxlint

npm run optimize:models  # regenerate src/assets/glb/*.glb from glb/original/
npm run previews         # re-screenshot project sites (needs extra installs, see below)
```

There are no tests and no test runner. Verification here is done by driving the
running scene and measuring it — see **Verifying changes**.

`npm run previews` needs tooling that is deliberately not installed, because the
browser download is large and previews only change when a project's site changes:
`npm i -D playwright sharp && npx playwright install chromium`.

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

## Common changes

### Add a project

Append to `PROJECTS` in `src/data/projects.js` (`id`, `title`, `subtitle`, `color`,
`inkColor`, `preview`, `url`), drop a tall screenshot at `public/previews/<id>.webp`
or run `npm run previews`, and stop. Carousel spacing, fan, focus wrapping and the
overlay all read the array length; nothing else needs editing.

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
  shot once the intro ends to force that linking while nothing is moving. If you add
  materials that first appear mid-transition, warm them the same way.
- **Preview textures are the memory cost.** A tall screenshot is several megabytes
  of VRAM decoded, so `usePreviewTexture.js` loads one only while its cartridge is
  live and disposes it on eject. It hands the texture back **only while its url still
  matches the one being asked for**: on a direct swap between projects the url changes
  a render before the new texture arrives, and returning the outgoing one would let
  the renderer re-upload it after disposal, stranding a GPU texture nothing owns.
  Keep that url check if you touch the hook.
- The models are preloaded from `index.html` by a small plugin in `vite.config.js`,
  using `crossorigin` that matches how three fetches them. Mismatch it and the
  browser downloads every model twice.

## Verifying changes

Screenshots alone are not enough here, and aggregate pixel diffs have produced false
"no change" results — a blank cartridge label is under 1% of the frame, which is
below the run-to-run noise of the idle animations. Look at the image *and* measure
the specific thing.

The dev build exposes hooks for this: `window.deviceStore` drives the state machine
without synthesising clicks, plus `__scene`, `__camera`, `__gl` (texture counts) and
`__audioBus` (metering).

If you drive a headless browser, note that software rendering runs a few frames per
second. Frame-time numbers from it are noise, and CSS transitions lag behind
wall-clock, which reads as a broken theme. CPU profiles remain trustworthy for
attribution, and audio must be metered on the audio thread via an `AudioWorklet` —
sampling on the main thread misses short sounds entirely.

## House rules

`agent.md` holds the user's standing preferences. The parts that still apply:
Tailwind utilities over custom CSS, Remix Icon for iconography **if icons are ever
added** (the dependency was removed as unused), viewport background `#faf9f6`,
mobile-first and responsive, no dead code, and comments that explain *why*.

Its "File Structure" section describes an older layout (`src/styles/`, `src/utils/`)
that does not exist; the table above is current.
