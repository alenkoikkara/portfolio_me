import { createSkySample } from './sampleSky'

/** 05:40, before dawn — where the day starts, under the greeting. */
export const PROLOGUE_HOUR = 5 + 40 / 60
/** 08:10, morning — where Begin's sunrise lands, and home's first light. */
export const HOME_HOUR = 8 + 10 / 60

/**
 * The time of day and the sky it gives, as one plain mutable object.
 *
 * Not React state: the sky changes every frame while time moves, and nothing
 * that reads it should re-render for that. SkyDriver.jsx samples it each frame
 * and everything else — lights, shadows, CSS variables, the glass — reads
 * `sample` from here.
 *
 *   hours     monotonic hours since Day 1 00:00; 29.5 is Day 2, 05:30
 *   sample    the sky at `hours` (sampleSky.js)
 *   light     how much of the sky's light the current mode lets in, 0–1 —
 *             the gallery switches the device's lights off, and the projector
 *             takes the room down (SkyDriver.jsx)
 */
export const sky = {
  hours: PROLOGUE_HOUR,
  sample: createSkySample(),
  light: 1,
}

/*
 * Dev only: `?t=18.9` starts the sky at 18:54, for tuning the keyframes. The
 * hours can also be scrubbed live from the console through `window.__sky`.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const t = new URLSearchParams(window.location.search).get('t')
  if (t !== null && t !== '' && !Number.isNaN(+t)) sky.hours = +t
  window.__sky = sky
}
