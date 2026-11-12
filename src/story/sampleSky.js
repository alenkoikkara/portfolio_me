import * as THREE from 'three'
import { SKY_KEYS } from './skyKeys'

/*
 * Turns the keyframes' on-screen azimuth into a world direction. The rest
 * camera does not look down -Z: it sits up and to the front-right of the device
 * looking diagonally back at it, so screen-left is world (-X, +Z) and "behind
 * the device" is (-X, -Z). Rotating the compass by 45° makes 0° come from the
 * left of the screen, as the keyframes mean it, rather than from world -X.
 */
const SCREEN_YAW = -45

const rad = THREE.MathUtils.degToRad

/** Unit vector from the device toward the light, for an elevation and an on-screen azimuth. */
export function sunDirection(elev, azim) {
  const e = rad(elev)
  const a = rad(azim + SCREEN_YAW)
  return new THREE.Vector3(-Math.cos(a) * Math.cos(e), Math.sin(e), -Math.sin(a) * Math.cos(e)).normalize()
}

const PREPARED = SKY_KEYS.map((k) => ({
  h: k.h,
  sunDir: sunDirection(k.sunElev, k.sunAzim),
  sun: new THREE.Color(k.sun),
  sunI: k.sunI,
  hemiSky: new THREE.Color(k.hemiSky),
  hemiGround: new THREE.Color(k.hemiGround),
  hemiI: k.hemiI,
  envI: k.envI,
  bgTop: new THREE.Color(k.bgTop),
  bgBottom: new THREE.Color(k.bgBottom),
  shadow: new THREE.Color(k.shadow),
  shadowA: k.shadowA,
  exposure: k.exposure,
  stars: k.stars,
}))

/** A sample to write into, so the frame loop never allocates. */
export function createSkySample() {
  const p = PREPARED[0]
  return {
    sunDir: p.sunDir.clone(),
    sun: p.sun.clone(),
    sunI: p.sunI,
    hemiSky: p.hemiSky.clone(),
    hemiGround: p.hemiGround.clone(),
    hemiI: p.hemiI,
    envI: p.envI,
    bgTop: p.bgTop.clone(),
    bgBottom: p.bgBottom.clone(),
    shadow: p.shadow.clone(),
    shadowA: p.shadowA,
    exposure: p.exposure,
    stars: p.stars,
  }
}

const lerp = THREE.MathUtils.lerp
const smooth = (t) => t * t * (3 - 2 * t)

/**
 * The sky at `hours` — any number, counted from Day 1 00:00, so 29.5 is
 * Day 2 05:30 — written into `out`. Between two keys the move is smoothstepped,
 * so the light settles into each key rather than turning a corner at it.
 */
export function sampleSky(hours, out) {
  const h = ((hours % 24) + 24) % 24
  let i = 0
  for (let k = 0; k < PREPARED.length; k++) if (PREPARED[k].h <= h) i = k
  const a = PREPARED[i]
  const b = PREPARED[(i + 1) % PREPARED.length]
  // The last key wraps round to the first at midnight.
  const bh = i === PREPARED.length - 1 ? b.h + 24 : b.h
  const t = smooth((h - a.h) / (bh - a.h))

  out.sunDir.lerpVectors(a.sunDir, b.sunDir, t).normalize()
  out.sun.lerpColors(a.sun, b.sun, t)
  out.sunI = lerp(a.sunI, b.sunI, t)
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, t)
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, t)
  out.hemiI = lerp(a.hemiI, b.hemiI, t)
  out.envI = lerp(a.envI, b.envI, t)
  out.bgTop.lerpColors(a.bgTop, b.bgTop, t)
  out.bgBottom.lerpColors(a.bgBottom, b.bgBottom, t)
  out.shadow.lerpColors(a.shadow, b.shadow, t)
  out.shadowA = lerp(a.shadowA, b.shadowA, t)
  out.exposure = lerp(a.exposure, b.exposure, t)
  out.stars = lerp(a.stars, b.stars, t)
  return out
}
