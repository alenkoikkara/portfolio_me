import React, { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sky } from '../sky'
import { sampleSky } from '../sampleSky'
import useStoryStore from '../useStoryStore'
import { isMobile } from '../environment'
import useDeviceStore, { GALLERY_MODES } from '../../scene/useDeviceStore'

/*
 * The keyframes' light levels are relative; these bring them up to this scene,
 * calibrated against the studio rig it replaced — a key of 3.4, an environment
 * of 1.6 and an exposure of 1.15. Both are matched at the day's brightest,
 * midday, not at 08:10: an overhead sun lands square on the keycaps' tops, and
 * scaled for the morning the light blew them out to white by noon. The sky's
 * fill is new — the old rig had none — so it is kept low, under the sun.
 */
const SUN_SCALE = 2.1
const HEMI_SCALE = 0.5
const ENV_SCALE = 1.6
const EXPOSURE_SCALE = 1.15

/** How far the sun stands from the device, in metres — just past the shadow camera's reach. */
const SUN_DISTANCE = 0.5
/**
 * At dusk the sun's keyframe dips below the horizon. A light from under the
 * floor would light the device's underside and throw its shadow up the sky,
 * so it never goes lower than this; its colour and intensity already say dusk.
 */
const MIN_SUN_HEIGHT = 0.04

/*
 * Longest frame the mode's ease will act on, in seconds — the cap every
 * exponential ease in this scene carries (see MAX_EASE_STEP in Device.jsx).
 * The frame the carousel opens also links every cartridge shader, and without
 * this it took the exposure its whole way in that one frame.
 */
const MAX_LIGHT_STEP = 0.1

/** The modes in which a cartridge is seating or its preview is being thrown. */
const PROJECTOR_MODES = new Set(['INSERTING', 'PROJECTING'])

/**
 * How much of the sky's light each mode lets in, relative to rest.
 *
 * The projector takes the room down so the preview has something to read
 * against — from the moment a cartridge starts seating, like settling in to
 * watch. Browsing the carousel does not: it is the projects chapter, at
 * midday, and the light is the point. The gallery is a different room: the sun and sky are aimed
 * at a 92 mm device and are directional, so they would reach the wall too and
 * flatten it head-on, cancelling the grazing light it hangs its depth on — so
 * they go out and the wall lights itself, keeping a little of the environment.
 */
export function modeLight(mode) {
  if (GALLERY_MODES.has(mode)) return { exposure: 0.87, env: 0.31, light: 0 }
  if (PROJECTOR_MODES.has(mode)) return { exposure: 0.65, env: 0.375, light: 0.35 }
  return { exposure: 1, env: 1, light: 1 }
}

/**
 * The environment's intensity for a mode at the sky's current hour. drei's
 * `<Environment>` re-applies its prop on every render, so it is handed exactly
 * what this driver is steering toward — a re-render must land where the ease
 * already is, or it knocks the room's light down and the ease climbs back.
 */
export function envIntensityFor(mode) {
  return sky.sample.envI * ENV_SCALE * modeLight(mode).env
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const SHADOW_MAP_SIZE = isMobile() ? 1024 : 2048
const cssCache = {}

/** Written only when the value changes: a style write per frame per variable would restyle the page sixty times a second. */
function setVar(name, value) {
  if (cssCache[name] === value) return
  cssCache[name] = value
  document.documentElement.style.setProperty(name, value)
}

/**
 * The light of the hour: the sun (or moon), the open sky's fill, the
 * environment's strength and the exposure, all from `sky.sample`, and the CSS
 * variables that carry the same sky to the page behind the canvas. The ink is
 * not among them: the page stays near white, so the text never changes.
 *
 * It samples `sky.hours` every frame — cheap, nine keys — rather than being
 * told when it changes, so anything that moves the clock, from the story to a
 * console scrub through `window.__sky`, is simply picked up.
 */
export default function SkyDriver() {
  const sunRef = useRef()
  const hemiRef = useRef()
  const { gl, scene } = useThree()
  const mode = useDeviceStore((s) => s.mode)
  // The mode's share of the light, eased so a change of mode dims rather than cuts.
  const factor = useRef(null)
  // The spin whose end has been written, so a settled clock is left alone —
  // which is what keeps `?t=` and a console scrub through `__sky` working.
  const settled = useRef(0)

  // Seeded before the first frame, so nothing eases in from zero on load.
  useLayoutEffect(() => {
    sampleSky(sky.hours, sky.sample)
    factor.current ??= { ...modeLight(useDeviceStore.getState().mode) }
    sky.light = factor.current.light
    gl.toneMappingExposure = sky.sample.exposure * EXPOSURE_SCALE * factor.current.exposure
    scene.environmentIntensity = envIntensityFor(useDeviceStore.getState().mode)
  }, [gl, scene])

  useFrame((_, delta) => {
    // Move the clock along the story's current spin, if one is under way.
    const { fromTime, toTime, travelStart, travelMs } = useStoryStore.getState()
    if (travelStart !== settled.current) {
      const p = travelMs <= 0 ? 1 : Math.min(1, (performance.now() - travelStart) / travelMs)
      sky.hours = fromTime + (toTime - fromTime) * easeInOutCubic(p)
      if (p >= 1) settled.current = travelStart
    }

    const s = sampleSky(sky.hours, sky.sample)
    const step = Math.min(delta, MAX_LIGHT_STEP)
    const target = modeLight(mode)
    const f = factor.current
    for (const key of ['exposure', 'env', 'light']) f[key] = THREE.MathUtils.damp(f[key], target[key], 4, step)
    sky.light = f.light

    const sun = sunRef.current
    sun.position.copy(s.sunDir).multiplyScalar(SUN_DISTANCE)
    sun.position.y = Math.max(sun.position.y, MIN_SUN_HEIGHT)
    sun.color.copy(s.sun)
    sun.intensity = s.sunI * SUN_SCALE * f.light

    const hemi = hemiRef.current
    hemi.color.copy(s.hemiSky)
    hemi.groundColor.copy(s.hemiGround)
    hemi.intensity = s.hemiI * HEMI_SCALE * f.light

    scene.environmentIntensity = s.envI * ENV_SCALE * f.env
    gl.toneMappingExposure = s.exposure * EXPOSURE_SCALE * f.exposure

    setVar('--sky-top', `#${s.bgTop.getHexString()}`)
    setVar('--sky-bottom', `#${s.bgBottom.getHexString()}`)
    setVar('--sky-stars', s.stars.toFixed(2))
  })

  return (
    <>
      <directionalLight
        ref={sunRef}
        castShadow
        // Halved on a phone, whose GPU is the tightest budget the scene has.
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        // Wide enough for the longest shadow the day throws — a 15 mm device
        // with the sun five degrees up, near 20 cm — or it ends in a hard
        // straight edge where the shadow map runs out.
        shadow-camera-near={0.05}
        shadow-camera-far={1.5}
        shadow-camera-left={-0.6}
        shadow-camera-right={0.6}
        shadow-camera-top={0.6}
        shadow-camera-bottom={-0.6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.002}
        shadow-radius={4}
      />
      <hemisphereLight ref={hemiRef} />
    </>
  )
}
