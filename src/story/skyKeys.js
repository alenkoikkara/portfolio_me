/**
 * The look of the whole day, one keyframe per moment that matters. The sky is
 * interpolated between them (sampleSky.js); tune the day here.
 *
 * The first key must be at h = 0, and the last wraps round to it at midnight.
 *
 *   h                  hour, 0–24
 *   sunElev, sunAzim   degrees. Azimuth is measured on screen, from the rest
 *                      camera's point of view: 0 = from the left, 90 = from
 *                      behind the device, 180 = from the right.
 *   sun, sunI          the directional light — the sun by day, the moon by night
 *   hemiSky, hemiGround, hemiI   the open sky's fill
 *   envI               the studio environment map's intensity
 *   bgTop, bgBottom    the CSS sky gradient behind the canvas — always near
 *                      white: cool at night, pure at noon, cream at golden hour
 *   shadow, shadowA    the shadow's tint and strength. On a white page the
 *                      shadow carries the hour, not the background: long and
 *                      warm at sunrise and golden hour, short and neutral at
 *                      noon, faint blue-grey under the moon. Never above about
 *                      0.25 — a soft stain on paper, not a cutout
 *   exposure           tone-mapping exposure
 *   stars              0–1, the ink star chart; only around midnight, since
 *                      ink dots on white read as dust any other time
 *
 * The dark device must still read as an object at night, so the night's fill
 * and environment stay high. Light intensities are relative; SkyDriver.jsx scales them to the scene.
 * Colours are sRGB hex.
 */
export const SKY_KEYS = [
  // 00:00 night — cool white, faint blue-grey moon shadow
  { h: 0.0, sunElev: 38, sunAzim: 120, sun: '#c9d4ff', sunI: 0.35, hemiSky: '#dde3f2', hemiGround: '#b9bcc8', hemiI: 0.45, envI: 0.55, bgTop: '#eceef4', bgBottom: '#f5f6f9', shadow: '#3a4566', shadowA: 0.1, exposure: 0.95, stars: 1.0 },
  // 05:40 pre-dawn (prologue) — cool white, almost no shadow
  { h: 5.67, sunElev: 4, sunAzim: 15, sun: '#aab4d6', sunI: 0.1, hemiSky: '#e2e6f2', hemiGround: '#c4c4cc', hemiI: 0.45, envI: 0.55, bgTop: '#edeff6', bgBottom: '#f7f3f1', shadow: '#4a5370', shadowA: 0.05, exposure: 0.96, stars: 0.0 },
  // 06:30 sunrise — blush at the bottom edge, long warm shadow to the right
  { h: 6.5, sunElev: 7, sunAzim: 20, sun: '#ffc89a', sunI: 0.95, hemiSky: '#eef0f6', hemiGround: '#d8cbbe', hemiI: 0.5, envI: 0.7, bgTop: '#f3f2f5', bgBottom: '#fbf2ea', shadow: '#8a5a3c', shadowA: 0.18, exposure: 1.0, stars: 0.0 },
  // 08:10 morning (home)
  { h: 8.17, sunElev: 24, sunAzim: 35, sun: '#ffe6c8', sunI: 1.3, hemiSky: '#f4f6f9', hemiGround: '#d9d1c7', hemiI: 0.55, envI: 0.85, bgTop: '#f6f7f8', bgBottom: '#fcf9f4', shadow: '#5e5248', shadowA: 0.2, exposure: 1.0, stars: 0.0 },
  // 12:40 midday (projects) — pure white, short crisp neutral shadow. Not
  // straight behind the device, as the first draft had it: the glossy keycaps
  // mirror the sun to the opposite side at the same height, and from behind at
  // 64° that went straight into the rest camera, in front at about 53°,
  // burning the tops and labels out to white. Not high overhead either: the
  // carousel's camera looks almost straight down, and at 72° the reflection
  // passed 18° from it, washing the device out below the cartridges. Round to
  // the left at 58°, it misses both. A little less sun and exposure too, as a
  // camera stops down at noon.
  { h: 12.67, sunElev: 58, sunAzim: 40, sun: '#ffffff', sunI: 1.3, hemiSky: '#ffffff', hemiGround: '#d9d4cc', hemiI: 0.6, envI: 1.0, bgTop: '#fbfbfa', bgBottom: '#ffffff', shadow: '#3e3a36', shadowA: 0.24, exposure: 0.92, stars: 0.0 },
  // 16:30 afternoon — stopped down a little, like midday
  { h: 16.5, sunElev: 35, sunAzim: 140, sun: '#fff0dc', sunI: 1.3, hemiSky: '#fbfaf8', hemiGround: '#d8d0c4', hemiI: 0.58, envI: 0.95, bgTop: '#faf9f6', bgBottom: '#fdfbf7', shadow: '#50463c', shadowA: 0.22, exposure: 0.95, stars: 0.0 },
  // 18:55 golden hour (photography) — warm cream, long amber shadow to the left
  { h: 18.92, sunElev: 8, sunAzim: 165, sun: '#ffb877', sunI: 1.35, hemiSky: '#fcf3e8', hemiGround: '#d9c3a8', hemiI: 0.5, envI: 0.75, bgTop: '#fbf5ec', bgBottom: '#fcf0e1', shadow: '#8c5428', shadowA: 0.22, exposure: 1.0, stars: 0.0 },
  // 20:15 dusk — lavender-grey white, shadow fading out
  { h: 20.25, sunElev: 3, sunAzim: 175, sun: '#c8b4dc', sunI: 0.25, hemiSky: '#ece9f2', hemiGround: '#c2bac6', hemiI: 0.45, envI: 0.6, bgTop: '#f1eff5', bgBottom: '#f7f0ee', shadow: '#5a4a6a', shadowA: 0.08, exposure: 0.97, stars: 0.0 },
  // 23:30 night (about) — cool white, ink star chart
  { h: 23.5, sunElev: 38, sunAzim: 120, sun: '#c9d4ff', sunI: 0.35, hemiSky: '#dde3f2', hemiGround: '#b9bcc8', hemiI: 0.45, envI: 0.55, bgTop: '#eceef4', bgBottom: '#f4f5f9', shadow: '#3a4566', shadowA: 0.1, exposure: 0.95, stars: 1.0 },
]
