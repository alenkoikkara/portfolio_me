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
npm run constellations   # regenerate the about view's real constellation figures
```

Tests cover the logic that decides what the scene should do; the drawing itself is
verified by driving the running scene and measuring it — see **Verifying changes**
and **What the tests cover** below.

`npm run previews` needs Playwright, which is deliberately not installed because the
browser download is large and previews only change when a project's site changes:
`npm i -D playwright && npx playwright install chromium`. (sharp, which both scripts
use, is already a devDependency.)

## Architecture

### The sky: one day in Chicago

The site is being rebuilt as one day told through light — `hichord-story-plan.md`
is the master plan, worked phase by phase. **All six phases are in**: the page
behind the transparent canvas is the sky of the hour, the device is lit by its
sun, each section is a chapter at its own hour, the day opens before dawn on
the greeting's lift (see **Loading and the intro**), and each chapter plays its chord
(see **Add a sound**); Contact holds its chord until the visitor reaches out,
and a full visit can be played back as a song; and the ambient polish below
keeps the room alive without anything shouting.

- **`src/story/sky.js` holds the hour, as a plain mutable object — never React
  state.** `sky.hours` counts monotonically from Day 1 00:00 (29.5 is Day 2,
  05:30); `sky.sample` is the sky at that hour. `SkyDriver.jsx` samples it every
  frame and everything else reads `sky.sample`. In dev, `?t=18.9` starts at
  18:54 and `window.__sky.hours = 23.5` scrubs it live.
- **The day's look is the keyframe table in `src/story/skyKeys.js`**, eased
  between by `sampleSky.js`. Azimuths are *on screen* from the rest camera —
  0° from the left, 90° from behind, 180° from the right — and `sunDirection`
  turns the compass 45° to make that true, because the rest camera looks
  diagonally back at the device, not down -Z. **The page is near white at every
  hour** — the plan's revision: night is a cool white with an ink star chart,
  not navy — so the time is told by the shadow and the light on the device,
  and the colours are taken from the plan as written, with two measured
  exceptions in the sun: **midday's sun swung to 40° and lowered to 58°** — the glossy keycaps mirror the sun to the opposite
  side at its own height, and straight behind at 64° that went straight into
  the rest camera (in front at about 53°), while at 72° it passed 18° from the
  carousel's near-overhead camera; either way the tops and labels burned out;
  and midday and afternoon **stopped down** a little.
- **`SkyDriver.jsx` replaces the studio's three fixed lights** with one sun
  (the only shadow caster) and a hemisphere fill, and drives the environment
  map's strength and the exposure. Its `*_SCALE` constants bring the table's
  relative levels to this scene, matched at midday against the old rig. **The
  modes still dim on top of the sky** (`modeLight`): the projector takes the
  room down from the moment a cartridge starts seating, and the gallery puts
  the sun and sky out so the wall lights itself — eased as before, and
  `sky.light` carries the result to the shadows. **Browsing the carousel no
  longer dims anything:** it is the projects chapter's midday, and a dark veil
  there would hide the very light the chapter is about. Phase 6's blinds are
  meant to take over the projector's dimming.
- **Chapters (`src/story/chapters.js`) are the sections read as hours**, and
  `useStoryStore.js` is the story: which chapter, and the clock's current spin
  (from where, to where, since when). `bridge.js` is its only input — one
  subscription turning device modes into chapters (closing modes are left out,
  so a section still on screen keeps its chapter until rest) — so the sections
  themselves never learn the story exists. **Time only moves forward**
  (`nextOccurrence`): About to Photography races through the night into Day 2.
  **Every spin sets off from `sky.hours` as it is now**, so a spin interrupted
  by another carries on from the light on screen. **Going home holds the
  light.** `SkyDriver` moves `sky.hours` along a spin only while one is
  running and leaves a settled clock alone, which is what keeps `?t=` and
  `__sky` scrubbing working.
- **Each chapter is a page** (`useStoryRouting.js`): its own address and title,
  the back and forward buttons, and the keys 1–4 (listed by the corner's `?`). `navigate.js` opens a chapter
  from anywhere — the device only opens a section from rest, so from elsewhere
  it goes home through `goHome` and opens on arrival; a later request replaces
  a waiting one. While a back or forward is replayed, the chapters passed
  through on the way push no history of their own. **The host must serve
  `index.html` for a chapter's address** (Cloudflare's single-page fallback,
  set in the dashboard) or a reload on `/about` 404s before any of this runs.
- **The story's corner (`StoryHUD.jsx`)** is the name — still the way home —
  the clock, and the chapter's title and caption, top left rather than the
  plan's bottom left: the bottom left is the key hints', the gallery
  caption's, and the about view keeps only 56 px there. `aboutLayout.js`'s
  `CHROME_TOP` grew to 88 to make room. The clock is written straight into the
  DOM from `sky.hours` each animation frame, never through React. It counts
  whole minutes with a hair of tolerance: hours are stored as fractions, and
  08:10 is a rounding error under itself — it read 08:09.
- **Contact is the fourth section, and the simplest**: one device mode,
  `CONTACT`, opened by its key from rest, with no transitional modes — the
  panel (`components/ContactPanel.jsx`) is DOM beside the device at rest and
  fades in CSS, so nothing has to report that it arrived. `Device.jsx` treats
  it as rest (`atRest`), like the about view. Entering it **holds** its chord
  (`holdChord`), a suspended V; **reaching out** — writing, copying the
  address, following any link, the device's own link keys included — calls
  `resolveContact`, which resolves the chord home and swaps the caption to "See
  you tomorrow." Leaving without reaching out just lets the chord fade. The
  links and the address live in `data/contact.js`, shared with the device's
  keys; **`CONTACT_EMAIL` is null until Alen sets it**, and with it null there
  is no email row at all.
- **The epilogue (`story/dom/SongPrompt.jsx`):** once all four chapters are
  visited, home offers the visit back — the four chapters' chords in the order
  seen (`songChords`), at 76 bpm, then home to D (`playSong`). Each chord
  presses its chapter's key on the device (`pressKey` → `pressedKey`, which
  `DeviceButton` animates without opening anything; the press present at
  mount is skipped so nothing replays an old one). "Copy link" writes
  `/?song=` with one letter per chapter; a visitor arriving on one sees
  "someone's visit" on reaching home, to play but not re-share. A link is only
  data: `songFromQuery` accepts exactly four different section letters and
  nothing else.
- **The polish (Phase 6), each piece small and each skippable:**
  - **Blinds** (`story/scene/Blinds.jsx`): in the projects chapter, slats that
    draw nothing but cast shadows hang between the sun and the device, so
    thin stripes fall across the desk; they close as a cartridge seats. One
    instanced mesh (a mesh that draws nothing still costs a draw call per
    pass), and `raycast` off, or slats in front of the keys would swallow their
    clicks. First drafted at 22 slats tilted 1.3 rad across 36 cm, the stripes
    read as heavy bars over the whole window; 16 slats at 1.45 rad across 24 cm
    are hairlines around the device. **The projector's dark veil stays** — on a
    bright 12:40 sky the preview needs it; the blinds close over it.
  - **Shutter and grain:** opening a print plays `playShutter` (peaks about
    −10 dBFS, just under a key click); the photography chapter's film grain is
    the `.sky__grain` layer, still on a phone but without its flicker.
  - **The current milestone breathes** in the about view: it alone wears a
    thin amber ring, whose opacity eases 0.5 ↔ 1 over 2.5 s once out
    (`CURRENT_ID`, the last in the timeline).
  - **The L train** (`TrainPass.jsx`): every 30–50 s from 06:00 to midnight,
    at rest only (home and contact), a warm light sweeps the desk with a
    distant rumble (about −27 dBFS) and, by night, a dashed ink line slides
    along the foot of the sky at 15% of the star chart's strength — lit
    windows would not show on white. In dev `window.__train()` sends the next one now.
  - **Idle sway** is the rest camera, not the device — the device never
    moves: on home it swings ±0.4° around the device over nine seconds,
    measured at 44.61°–45.39° about rest. Off with reduced motion.
  - **Cursor glint** (`CursorGlint.jsx`): a faint light following the pointer
    a little above the keys, about 5% of the sun, at rest on desktop only.
  - **Phones:** the rest pose stands at half its distance on a portrait
    window (`restDistanceScale` in `cameraFov.js`, with the intro scaled to
    match), so the device fills 71% of a 390 px phone's width instead of 37% —
    the rest pose only, since narrowing the field of view would also crop the
    carousel and the projector. The shadow map halves to 1024, and the blinds,
    the train and the glint are **not mounted** at all (`environment.js`): a
    light at zero intensity is still one every lit material loops over, and at
    1024 the blinds' stripes alias into a sparkle.
- **The ink never changes.** `--ink`, `--ink-muted`, `--rule`, `--accent` and
  `--accent-deep` are fixed tokens in `story.css`, and `story/palette.js`
  holds the canvas's copies — change one, change both. Amber (`--accent`) is
  for marks only — the current milestone's ring —
  and `--accent-deep` is the one accent dark enough for words (link hover).
  The about view's glass frosts to white at every hour, and the
  constellation is an astronomer's chart: solid ink dots with no glow, and
  hairline ink lines at 30%. The about view keeps its own faint ambient
  stars, despite the plan's §9: the frost blurs the page's sky away behind
  the pane, so its stars would not show through. §9's coordinate fix does not
  apply either — the about view rides with the camera.
- **The sun's shadow falls on `ShadowCatcher.jsx`**, a ground that draws only
  shadow, and on a white page it carries the hour: its tint and strength are
  keyed (`shadow`, `shadowA`) — warm brown at sunrise and golden hour,
  neutral at noon, faint blue-grey under the moon, never above 0.25. The sun
  is never lower than `MIN_SUN_HEIGHT`, because a light
  from under the floor lit the device's underside. The shadow camera spans
  ±0.6 m: at ±0.3 the long morning and evening shadows ended in straight edges
  where the map ran out.
- **The sky's CSS:** `SkyDriver` writes `--sky-top`, `--sky-bottom` and
  `--sky-stars`; `.stage` maps the `--stage-*` variables onto the fixed ink,
  and only the projector's dark veil turns the text light.
  `sampleSky.test.js` holds both ends of the gradient above 93% lightness and
  the ink and muted ink to WCAG AA against them every ten minutes of the day,
  the shadow under 0.25, and the stars to the hours round midnight. A tint
  should be noticeable only *as it changes*: if one reads on its own, pull
  that key back toward white.
- **Anything that used to assume the cream page now reads the sky:** the key
  labels (`var(--stage-ink)`, as a style — SVG presentation attributes take no
  CSS variables), both glass shaders' "nothing behind me" colour, and the
  gallery's backdrop, which draws nothing at all now.

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

`goHome()` — the name in the story's corner — is the way back to rest from anywhere, and it
follows the same shape. It routes through the exits that already exist rather than
slamming the mode to `IDLE`: from `PROJECTING` it ejects, from a gallery mode it
closes, and from a cartridge in flight it sets `pendingHome` so the running
animation carries the request the rest of the way. A cartridge halfway to the slot
would otherwise wink out of existence. `pendingHome` beats `pendingIndex`, so the
way out wins over a project queued behind it.

The about key runs a third arm:

```
IDLE ──openAbout──> OPENING_ABOUT ──aboutOpened──> ABOUT
  <──aboutClosed── CLOSING_ABOUT <──closeAbout─────┘
```

A pane of frosted glass comes up over the scene, after Apple's Liquid Glass,
and blurs the device into soft light and shadow; on it a constellation of
milestones draws itself, with the bio to its right — or above it, on a narrow
window. The page stays light and the room stays lit as at rest. The project
chip in `Stage.jsx` was a blacklist that would have printed a title beside the
bio, and is now a whitelist.

**The glass is `LiquidGlass.jsx`: one shader on a plane filling the frame,**
with the pane's rounded shape cut from it as a distance field in pixels — the
pane is screen-aligned, so nothing about it needs geometry. Each frame it
renders the scene into a quarter-size mipmapped buffer and draws, from that:
the frost (a blur of two rings of taps from a coarse mip, washed toward white),
a lens inside the bevel that bends what is behind inward with a faint colour
fringe, a specular line just inside the edge that is brightest along the top,
and a soft shadow on the page in the margin outside. What was learned getting
there:

- **drei's `MeshTransmissionMaterial` was tried first and dropped.** Its blur is
  random jitter, which at this size reads as grain rather than frost.
- **Tone-map the scene, then frost it — not the other way round.** The buffer
  is linear and un-tone-mapped; the shader runs it through three's own
  `toneMapping()` so the device seen through the glass is treated like the
  device anywhere else, and only then mixes in the white. Frosting first and
  tone-mapping the result turned the white grey (ACES pulls it down), and the
  pane came out darker than the page — the opposite of glass.
- **The buffer is rendered over the page's colour.** The canvas is transparent
  over the page, so a buffer with no background shows the device floating on
  black.
- **The constellation is hidden for that pass.** It stands in front of the
  glass, and left in, every star would show a second time inside the frost as
  a blurred ghost of itself.
- **Each tap is capped before averaging.** The buffer is HDR, and a glint off a
  dark keycap survives any average as a bright speck.
- **The pass reuses the frame's shadow maps** (`shadowMap.autoUpdate` off around
  it), so the glass costs one extra colour render at a quarter size, not a
  second shadow pass. It does nothing while its opacity is zero, and is
  unmounted entirely outside the about modes.

**The glass's fade moves the mode on** — up to `ABOUT`, down to `IDLE` — the same
rule as everywhere else: the animation reports that it finished, not a timer.
The constellation keeps drawing after the glass is up, so Escape works at once.
Closing is the overlay's × and Escape (Overlay.jsx): once up, **the glass takes
the pointer**, because the device's keys are still under it and a click on the
bio's margin would otherwise press one — the social keys would open links from
behind the glass. The about key therefore only opens.

**It is a page over the scene, not part of it, so it rides with the camera.**
`AboutView.jsx` copies the camera's pose into its group every frame, and
everything in it is placed in camera space from screen pixels (`aboutLayout.js`):
the glass 0.3 m in front of the lens, the content 0.25 m — both in front of the
device, half a metre away — drawn in that order with depth testing off, so the
device can never cut into a star. It fills the frame exactly whatever the camera
is doing. It is mounted after the device, so its frame callback runs after the
device has placed the camera and nothing lags by a frame.

Side by side needs 500 px of sky for the constellation: labels on the same side
of the path are two milestones apart, and at 1024 px wide two of them touched.
That is decided from the sky a window would actually get, not from a width.

**The milestones take the shape of a real constellation** with exactly as many
stars as there are milestones — Polaris, Canis Minor, Triangulum, Crux,
Cassiopeia, Lyra, Ursa Minor, Aquila, Auriga, Capricornus for one to ten — and
its name is set under it. The figures are the standard stick figures from
d3-celestial (BSD-3-Clause; the notice travels in the generated file),
projected as seen on the sky, north up and east left. No constellation has a
one-star figure, so one milestone is Polaris, labelled as a star. Milestones go
to the stars left to right, so the timeline still reads in order, but the lines
are the constellation's own, not a chain through the dates. Auriga and
Capricornus replaced Leo and Cepheus: Cepheus has three stars 15 px apart, and
Leo's sickle crowded its labels on a phone; no amount of label placement fixes
stars that close.

Labels are placed by `constellationLayout.js`: each tries eight sides of its
star, then every label reconsiders against all the others until nothing
improves — first-fit alone is order-dependent, and an early label can take the
only room a crowded later one had. Figures above five stars drop the subtitle.
Label widths are estimated from their text; the real rendered ones were
measured at no more than 93% of the estimate. On a narrow window the band's
height comes from a measured table, one height per star count, not a formula:
a taller band scales the figure up and reshuffles the free spots, so seven
stars that fit at 240 px collide at 270. A 320 px phone cannot fit ten.

The reveal runs on one clock in `Constellation.jsx`, in seconds from the key:
the bio at 0.22, ambient stars at 0.35, then each milestone star 0.14 s after
the last in date order; each of the figure's lines draws once both its stars
are out, and the figure's name comes up last. Leaving, all of
it fades together. Lines grow by rewriting their geometry in the frame loop, not
by React state — and their start points are memoised, because drei rewrites a
line's geometry whenever `points` is a new array, and the mode changing mid-draw
re-renders the component. Stars are ink; a faint one is ink mixed toward the
page colour rather than made transparent, which lets the ambient stars be one
instanced mesh with a single opacity for the fade.

**Both text layers — the bio and the milestone labels — are drei `<Html
transform sprite>`, scaled so one CSS pixel is one screen pixel.** drei draws a
CSS pixel of a transformed `<Html>` as `distanceFactor / 400` world units;
`aboutLayout.js` sets that to one screen pixel at the content's depth, per
window. A fixed factor scales the text with the window — fine on one laptop, a
quarter size on a phone — and any scale but 1 resamples it, which is what makes
CSS3D text soft. Two traps there: drei sizes its wrapper to the whole canvas, so
it is given `pointerEvents="none"` or it swallows every click on the page; and a
child's `pointer-events: auto` overrides its parent's `none`, so the "no clicks
until fully faded in" gate is set on the column itself, not on the element that
fades.

The photography key runs a second, parallel arm of the same machine:

```
IDLE ──openGallery──> OPENING_GALLERY ──galleryOpened──> GALLERY
  <──galleryClosed── CLOSING_GALLERY <──closeGallery──────┘
```

The two transitional modes are not decoration. The wall has **its own camera**, and
swapping which camera is default is a cut rather than a glide — so **both cuts are
arranged to land on an empty frame of one colour that the desk and the wall share**,
and nothing is ever seen changing.

`OPENING_GALLERY` is the beat where the device fades out — on the home page's
own colour, which the wall is hung on too, so the page itself never changes — while
the wall — mounted but five metres behind and out of frame — gets
its textures on the wire. The device's fade calls `galleryOpened()`, so the camera
cannot change hands while the desk is still on screen; the prints then come up into
the empty frame. `CLOSING_GALLERY` is the reverse: the prints clear with the camera
still on the wall, then it hands back to a desk that is still faded out, and the
device fades back in on `IDLE`.

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

**The gallery's hints sit on a pill of Liquid Glass drawn in the canvas, not in
CSS** (`GlassPill.jsx`). Apple's glass bends what is behind it, and
`backdrop-filter` only blurs — it refracts solely through SVG filters, which
Safari does not run. The DOM element (`data-glass-pill` in `Overlay.jsx`) keeps
the words and its padding sets the pill's size; each frame the pill reads that
rect and eases toward it, so it morphs when the text changes. It draws last
(`renderOrder` 1000) and, in `onBeforeRender`, copies the part of the frame
already drawn behind it with `copyFramebufferToTexture`, then refracts that. That
copy is of the finished, tone-mapped frame, so the colours through the glass
match the page exactly — a second render into a target would skip tone mapping
and come out graded differently. The glass stays clear — barely a pixel of
blur, with the look carried by the rim's lensing — and **the words adapt
instead, as Apple's do**: a few times a second it reads one row of pixels back
from behind the pill and turns each word white over dark content and ink over
light, with a gap between the two thresholds so a word over a mid-grey print
does not flicker. Frosting the glass until dark ink read over a dark print was
tried first; it made the pill a grey lozenge, which is what it is not.

**The story's corner sits on the same glass** (`HudGlass.jsx`, mounted in
`Stage.jsx`): `data-hud-glass` on `StoryHUD`'s wrapper, whose padding is the
glass and whose position is shifted out by it so the words stay put. Two
lines of text in a capsule read as a stadium, so it passes `radius` for a
rounded pane instead. It fades out under the projector's veil
(`INSERTING`, `PROJECTING`, `EJECTING`): the veil is DOM behind the canvas
and the glass composites the sky's own gradient, so there it would glow
white on a dark room.

**A layer hides things from the pointer as well as from a camera.** A `Raycaster`
tests layer 0 and nothing else unless told otherwise, so moving the wall onto its
own layer silently took every print out of reach of a click — no error, the prints
simply stopped responding. `Gallery.jsx` enables `GALLERY_LAYER` on R3F's raycaster
while the wall is mounted and disables it on the way out. Anything else put on a
layer needs the same, and the failure will look like a dead mesh rather than a
layer problem.

What keeps the cut itself invisible is that **the wall's backdrop draws
nothing** (`colorWrite` off): the desk and the wall both show the very same sky
behind the transparent canvas, so there is no colour to keep equal. It once
painted a colour of its own that had to match the page by hand, and any gap
showed as a flash at the moment the cameras swapped. The plane stays for the
click that steps out of a focused print. The device fade (`DEVICE_FADE_SECONDS`
in `Device.jsx`) still has to finish before the camera changes hands.

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

### Loading and the intro

The page opens on a greeting — hello, नमस्ते, こんにちは, hej — over the page
colour (`LoadingScreen.jsx`), each word's letters painted with a gradient of its
own light hue (`background-clip: text`, padded so Devanagari matras and
descenders are not clipped) and nothing behind them. All four words are on the page at once,
stacked, with only the active one shown: that is what lets each word come into
focus as the last dissolves (the fade, 700 ms, outlasts half of each 900 ms
turn), rather than one replacing the other with a gap of empty page. Two store
flags hand it over to the scene:

- `sceneReady` is set by `Device.jsx` on its *second* frame callback. Callbacks
  run before each frame is drawn, so the second is the first to come after a
  drawn frame: by then the models are in and their shaders linked, and that
  first-frame stall happened behind the greeting rather than in the intro.
- `curtainUp` is set as the greeting lifts (or by a deep link), and **it is
  what starts the intro.** Until then the animation mixer's `timeScale` is 0 and
  the camera's fly-in clock does not advance, so the intro holds on its first
  frame; without that it began the moment the device mounted and was half over
  before anyone could see it.

The greeting says all four words once whatever happens — on a warm cache the
scene is ready before "hello" has faded — then leaves at the next word boundary
once `sceneReady` is true, going round again if loading is slower. **The
decision to leave is made only inside the word's own timer, at the boundary.**
Watching `sceneReady` from an effect, as it first did, lifted the instant the
scene arrived and cut the showing word off mid-fade.

**There is no Begin screen.** The greeting lifting is what begins the day:
`LoadingScreen` calls `beginDay` (`navigate.js`) as it starts to fade, which
starts the story and raises the curtain. A Prologue with "begin with sound /
begin quietly" stood between the two until the user had it removed. The day
starts at 05:40 — `sky.hours` defaults to `PROLOGUE_HOUR` — and the canvas is
held at opacity 0 until then, so the device assembles in the first light
instead of sitting half-built under the greeting; it still renders
underneath, which is what `sceneReady` needs. **It always begins quietly**:
no click has happened yet, and browsers start sound only from one, so sound
waits for the corner's toggle or M — which is also why there is no sunrise
chord.

The first sunrise lasts `SUNRISE_MS`, which is
the intro's own length (`INTRO_SECONDS` in `scene/intro.js`, where the camera's
fly-in ends), so the sun and the device land on 08:10 together; the plan's 3.2 s
would have had the sun up long before the device finished assembling. A
returning visitor (`hichord:seen` in local storage) or one asking for reduced
motion gets the quick sunrise and the device already assembled.

Until the device is at rest, **any click or key skips** (`skipSunrise`, in
`story/dom/SunriseSkip.jsx`, which also shows the hint): the
spin lands (`skipTravel`) and `skipIntro` puts every clip on its last frame and
the fly-in clock at its end. The camera then eases home from wherever it had
reached — the same ease a drag lets go into — so a skip mid-flight still reads
as motion. The listeners are on capture, so the click that skips does not also
land on whatever was under it.

**Deep links** (`startFromAddress`): a chapter's address loaded cold skips the
sunrise and the intro and goes straight into the chapter at its
hour (`startAt`). It runs before the routing hook, and that hook ignores a
chapter already out of date when its effect fires — otherwise the cold load,
read as the day not yet begun (`'prologue'`) in the same flush, put the
address back to `/`. An address with no section yet falls to home, which
*replaces* it rather than leaving a step for the back button.

### Who owns what

| Concern | File |
|---|---|
| Canvas, renderer flags, debug hooks, shader warm-up | `src/scene/Stage.jsx` |
| Device model, all cameras, keys, intro playback | `src/scene/Device.jsx` |
| The device camera's field of view per window shape | `src/scene/cameraFov.js` |
| Cartridge strip layout and per-slot poses | `src/scene/Carousel.jsx` |
| One cartridge instance (mesh clone, materials, label) | `src/scene/Cartridge.jsx` |
| The cartridge that flies into the slot | `src/scene/ActiveCartridge.jsx` |
| Beam, preview plane, boot beat, spill light | `src/scene/Projector.jsx` |
| Beam and preview GLSL | `src/scene/projectorShaders.js` |
| All sound, synthesised at runtime | `src/scene/audio.js` |
| Studio environment map, contact shadow | `src/components/LightingSetup.jsx` |
| The hour and its sky, as mutable state (no React) | `src/story/sky.js` |
| The day's keyframes — tune the look here | `src/story/skyKeys.js` |
| Easing between keys; sun direction | `src/story/sampleSky.js` |
| Sun, sky fill, exposure, mode dimming, sky CSS vars | `src/story/scene/SkyDriver.jsx` |
| The ground the sun's shadow falls on | `src/story/scene/ShadowCatcher.jsx` |
| The sky behind the canvas: gradient, stars, grain, veil | `src/story/dom/SkyBackground.jsx`, `src/story/story.css` |
| Chapters: hours, titles, captions, modes and paths as chapters | `src/story/chapters.js` |
| The story: chapter, the clock's spin, chapters seen | `src/story/useStoryStore.js` |
| Device modes → story chapters | `src/story/bridge.js` |
| Opening a chapter from anywhere | `src/story/navigate.js` |
| Chapters as pages: address, title, back/forward, keys 1–4 | `src/story/useStoryRouting.js` |
| The story's corner: name, clock, chapter caption | `src/story/dom/StoryHUD.jsx` |
| The `?` list of keyboard shortcuts | `src/story/dom/KeyHelp.jsx` |
| The fixed ink and accent, for the canvas | `src/story/palette.js` |
| Click-to-skip the first sunrise, and its hint | `src/story/dom/SunriseSkip.jsx` |
| Contact: the panel, reaching out | `src/components/ContactPanel.jsx` |
| Social links and the published email | `src/data/contact.js` |
| The epilogue: a visit played back, share links | `src/story/dom/SongPrompt.jsx` |
| Chords and the small keys' notes | `src/story/chords.js` |
| Reduced motion and phone detection, for the polish | `src/story/environment.js` |
| Blinds, the L train, the cursor glint | `src/story/scene/Blinds.jsx`, `TrainPass.jsx`, `CursorGlint.jsx` |
| How long the device's intro lasts | `src/scene/intro.js` |
| DOM overlay: arrows, description, keyboard | `src/components/Overlay.jsx` |
| Loading screen: "hello" in four languages, curtain hand-off | `src/components/LoadingScreen.jsx` |
| Project catalogue | `src/data/projects.js` |
| Photography wall, culling, focus | `src/scene/Gallery.jsx` |
| One print (mesh, textures, springs) | `src/scene/Print.jsx` |
| Wall packing, camera distance, pan bounds | `src/scene/galleryLayout.js` |
| Gallery camera and its pan input | `src/scene/GalleryCamera.jsx` |
| Photo texture caches (thumb + full) | `src/scene/usePhotoTexture.js` |
| Photo catalogue | `src/data/photos.js` (+ generated `photos.generated.js`) |
| Camera settings: EXIF reading and wording | `src/data/exif.js` |
| Device fade, shared with its shadows | `src/scene/deviceFade.js` |
| The bio column: fade, pointer gating | `src/scene/AboutPanel.jsx` |
| About view: camera-riding group, mode reports | `src/scene/AboutView.jsx` |
| The frosted glass pane and its shader | `src/scene/LiquidGlass.jsx` |
| Liquid Glass pill under a DOM element (the gallery's hints) | `src/scene/GlassPill.jsx` |
| Liquid Glass under the story's corner, off under the projector's veil | `src/story/scene/HudGlass.jsx` |
| About view arithmetic: bio and constellation placement, depths, text scale | `src/scene/aboutLayout.js` |
| The constellation: stars, milestone path and its reveal | `src/scene/Constellation.jsx` |
| Where each star and label goes, in pixels | `src/scene/constellationLayout.js` |
| About copy, its styles, and the milestones | `src/scene/about/AboutContent.jsx`, `about.css`, `timeline.js` |
| Real constellation figures, 1–10 stars (generated) | `src/scene/about/constellations.generated.js` |

Unused, kept only as history — do not extend, and check before assuming it runs:
`src/components/DeviceModel.jsx` (superseded by `scene/Device.jsx`) and
`src/scene/insertionPath.js` (superseded by the stage machine inside
`ActiveCartridge.jsx`). Neither is imported anywhere.

### Scene conventions

- **Real-world scale, in metres.** The device is 92 × 98 × 15 mm, so a keycap is
  `0.008` tall and the camera's near plane is `0.001`. A near plane of `0.1` clips
  the entire model — this is the classic mistake here.
- **To change how big the device looks at rest, move the camera, not the device.**
  `REST_PULLBACK` in `Device.jsx` stands the rest pose further back along the same
  line, and pulls the intro fly-in back by the same factor so it still lands
  exactly on rest. Scaling the model instead would break the real-world scale the
  cartridges, slot and projector are all built to.
- **The device is the same share of the window's height on every desktop shape.**
  `cameraFov.js` locks the *vertical* field of view from an aspect of 1.25 up, at
  what a 16:9 window always had, so 5:4, 16:10, 16:9 and ultrawide all measure the
  device at 55% of the height. It was once a fixed horizontal FOV for every
  window, which made it a share of the *width*: 41% of the height at 4:3 and 73%
  on an ultrawide. Phones and portrait windows keep the horizontal lock, since
  there width is what runs out, and the two rules blend between aspects 1 and
  1.25. `aboutLayout.js` reads the same module to turn pixels into camera space,
  so the about view cannot drift from the camera.
- **The device never moves or rotates.** Every "the device slid down" effect is the
  camera changing pose. There are three: rest, open and projecting, all in
  `Device.jsx`. The about view keeps the rest pose; it frosts the device away
  behind glass rather than moving the view.
- **The open camera looks almost straight down**, which makes both `lookAt`'s roll and
  spherical azimuth degenerate. The up vector is therefore steered explicitly
  (world `+Y` at rest, world `-Z` when open). **Never reintroduce spherical
  interpolation for the camera** — it works in angles, and from overhead it sends
  the view around the far side and lands it upside down.
- **The return home eases the camera's direction and its distance apart** — a
  blend of direction vectors, with no angles in it, so the overhead case above is
  safe. Easing the position in a straight line, as it once did, cut the chord of
  the arc a drag had swung the camera through: the camera passed up to 19% nearer
  the device on its way back, and the device swelled and shrank as if zoomed.
  Measured after the fix: the distance holds at exactly the rest distance through
  the whole return from a drag, and the carousel's close from overhead still
  turns steadily home, upright, without once swinging away.
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

**Camera settings are read from the file, not written by hand.** The script parses
each original's EXIF (`exif-reader`) and stores the raw numbers — camera, ISO,
exposure in seconds, f-number — as `exposure` on the manifest entry; the overlay
formats them into the line under an opened print ("Apple iPhone 13 · ƒ/1.6 ·
1/1536s · ISO 50"), with the settings at the print's left edge and the camera at
its right. The reading and the wording both live in `src/data/exif.js`,
shared by the script and the UI. A photo whose EXIF was stripped on export gets no
line rather than an empty one, and the script lists those at the end of its run —
re-export with metadata kept to fix one.

That line is placed in CSS from the same fractions the camera uses to frame a
focused print (`FOCUS_FILL_WIDTH` / `FOCUS_FILL_HEIGHT` in `galleryLayout.js`), so
it sits under the image's bottom edge and spans exactly its width for any aspect.
While a print is open every other one fades out completely and stops taking
clicks, so it stands on the bare page colour; a click where a hidden print hangs
falls through to the backdrop and steps back to the wall. Height is 80% rather than the
whole frame to leave room for it; change those constants and both follow.

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

### Edit the about panel

The words are in `src/scene/about/AboutContent.jsx` and nothing else is — edit
them there without touching the scene. The milestones are in
`src/scene/about/timeline.js`, oldest first, and that is all there is to
adding one: their count picks the constellation, so the seventh turns Lyra into
Ursa Minor. Between one and ten — `constellationLayout.test.js` fails past ten,
and fails if any label, at any count from one to ten, lands on another label, a
star, the bio, the figure's name or off the screen, on any of the windows it
checks. To change which constellation stands for a count, edit `CHOICES` in
`scripts/prepare-constellations.mjs` and run `npm run constellations`; then run
the tests, because a figure with tightly packed stars may not leave its labels
room. Styles are in `about.css`, beside it, and
every colour reads a `--stage-*` variable, so keep it that way: the panel sits
on the light page, and a hard-coded or OS-dark-mode colour can put pale text on
it. The typeface is the site's own, inherited. If the column grows taller than a
short phone allows, it scrolls inside the space `aboutLayout.js` leaves for it
rather than running off the screen.

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

**Sound is opt-in, and off is fully silent.** `setSoundOn` is the switch:
`audio()` returns null while it is off, so with sound off no context is ever
created — every sound, old and new, already returned early on a null context.
Off suspends a live context, which silences even a running projector reel. It
is turned on only inside a click (the toggle in the story's corner, or M), because browsers start audio only from a gesture.
The story store's `soundOn` mirrors it for the UI.

**The music is synthesised here too**, not with Tone.js as the story plan
suggested: one more dependency and download for a handful of notes, and its own
context to keep in step with this one. Each chapter's chord (`story/chords.js`,
all in D major, sharing common tones so any order voice-leads) is strummed by
`playChord` on entering the chapter; the small keys
(LinkedIn, GitHub, Medium, explode) ring a pentatonic `playNote` under their
click. A pad voice is two sines — a body and a fast-dying tine an octave and a
fifth up, which reads as an electric piano — through a low-pass and a reverb
built from decaying noise. Metered on the master bus: chords peak at −19 to
−22 dBFS (RMS around −35), bells around −27, against −7 for a key click and a
−27 RMS reel — under the experience, as the plan asks, and within 3 dB of one
another so no chapter jumps out.

### Touch the overlay

`src/components/Overlay.jsx` for markup and keyboard, `src/index.css` for styling.
The overlay re-themes with the scene through `--stage-*` custom properties on the
wrapper in `App.jsx`: the fixed dark ink at rest, on the photography wall, in
the about view and the carousel, then light text on a dim veil as a cartridge
seats, and darker while it projects.
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
- **The pan limits stop just past the pictures.** `PAN_PADDING` is four `GAP`s
  (80 mm against 20 mm between prints), so the wall sits inside the window with a
  clear margin while the prints themselves hang tight together. It was once half a
  column pitch, which is a quarter of the screen height: panning to the bottom then
  put an empty band under every column at once, and the same above, and the wall
  appeared to have ended well before its last
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
- **drei's `<Environment>` re-applies `scene.environmentIntensity` on every
  render, and its default is 1.** Left unset it fought the lighting ease: any
  re-render knocked the room's ambient light from 1.6 down to 1 and the ease
  spent the next ten frames climbing back, which read as the scene flickering.
  It is now handed `envIntensityFor(mode)` (`SkyDriver.jsx`) — the value for
  that mode at the sky's current hour — so a re-render lands where the ease
  already wants to be.
  The same trap applies to any drei prop that writes to the scene and also has a
  default.
- **Nothing in the frame loop should be React state.** `isDragging` in
  `Device.jsx` is a ref, because drei's `OrbitControls` fires start and end on
  every click — even one that never moves — and as state that was two renders per
  click, cascading into the `<Environment>` reset above. If a value is only read
  inside `useFrame`, keep it in a ref.
- **Every exponential ease must clamp its frame delta.** `MathUtils.damp(a, b, k, dt)`
  resolves `1 - e^(-k·dt)` of the remaining distance, so one long frame resolves
  almost all of it and the move reads as a jump. `Device.jsx` caps the camera with
  `MAX_EASE_STEP`; `SkyDriver.jsx` caps the mode's light eases with
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
wall's layout arithmetic, the about view's and its constellation's, the texture stores' loading and eviction policy, the
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
`__audioBus` (metering). `__sky` scrubs the hour (`__sky.hours = 18.92`), as does
`?t=` on the URL, and `__train()` sends the next L train now. The gallery adds `__gallery` (layout, pan target, visible
set, bounds) and `__photoTextures` (`thumbStore.stats()` / `fullStore.stats()`), which
are how you check that off-screen prints are not resident and that switching focus
quickly does not strand a texture.

If you drive a headless browser, note that software rendering runs a few frames per
second. Frame-time numbers from it are noise, and CSS transitions lag behind
wall-clock, which reads as a broken theme. CPU profiles remain trustworthy for
attribution, and audio must be metered on the audio thread via an `AudioWorklet` —
sampling on the main thread misses short sounds entirely.

Four traps in that harness, each of which has already produced a confident wrong
answer:

- **`import('/src/scene/audio.js')` from the console is a second, separate
  module**, not the app's: Vite serves the app's copy at a versioned URL
  (`audio.js?t=…`). The fresh copy has sound off, so everything it plays is
  silent and reads as a broken mix. Import the URL the page actually loaded —
  `performance.getEntriesByType('resource')` lists it.

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
added** (the dependency was removed as unused), mobile-first and responsive, no dead code, and comments that explain *why*.

Its viewport background, `#faf9f6`, is superseded by the sky: the page is the
sky of the hour now, by the user's decision when the story plan was adopted.
`#faf9f6` survives only as the loading greeting's ground.

Its "File Structure" section describes an older layout (`src/styles/`, `src/utils/`)
that does not exist; the table above is current.
