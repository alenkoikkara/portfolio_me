import React, { useCallback, useEffect, useRef } from 'react'
import Cartridge from './Cartridge'
import useDeviceStore from './useDeviceStore'
import { PROJECTS } from '../data/projects'
import { PHONE_WIDTH } from './cameraFov'

/* ─── Layout constants ─── */
// The open camera looks straight down, so "above the device" on screen is -Z:
// the strip floats just beyond the back edge, where the cartridge slot is.
export const SPACING = 0.078
const FOCUSED_SCALE = 1.0
const SIDE_SCALE = 0.6
const SIDE_OPACITY = 0.4
export const CAROUSEL_Y = 0.02
export const CAROUSEL_Z = -0.1
const SIDE_RECEDE = 0.006
const SIDE_FAN = 0.12
// Let the camera settle before the strip fades in, then stagger outwards.
const FADE_IN_DELAY_MS = 350
const STAGGER_MS = 60
/** How far a finger must travel sideways, in CSS px, for a swipe rather than a tap. */
const SWIPE_PX = 40

/** Modes in which one cartridge is out of the strip, travelling or seated. */
const ACTIVE_MODES = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])
/*
 * Modes in which the strip exists at all.
 *
 * A whitelist, like every other mode guard in the scene. This used to ask for
 * "not IDLE", which quietly meant the strip also rendered through the gallery
 * modes — invisible while the wall's camera was up, but flashing into shot for
 * the moment the camera came back to the device on the way out.
 */
const STRIP_MODES = new Set(['BROWSING', 'INSERTING', 'PROJECTING', 'EJECTING'])

/**
 * Compute pose for cartridge at index i, given which index is focused.
 * Uses shortest circular path so wrapping items slide in from the correct side.
 */
export function slotPose(i, focusedIndex, n = PROJECTS.length) {
  // Raw offset, then take the shortest arc around the ring
  let offset = i - focusedIndex
  if (offset > n / 2)  offset -= n
  if (offset < -n / 2) offset += n
  const isFocused = offset === 0
  return {
    position: [offset * SPACING, CAROUSEL_Y, CAROUSEL_Z - Math.abs(offset) * SIDE_RECEDE],
    scale: isFocused ? FOCUSED_SCALE : SIDE_SCALE,
    opacity: isFocused ? 1 : SIDE_OPACITY,
    rotation: [0, offset * -SIDE_FAN, 0],
  }
}

/**
 * Carousel — renders N cartridge instances along X axis.
 *
 * The cartridge that is travelling or seated stays mounted here at zero
 * opacity rather than unmounting, so it never has to re-enter when it returns.
 * Visible during BROWSING, INSERTING, PROJECTING, EJECTING.
 * Fades in/out on mode transitions.
 */
export default function Carousel() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const insert = useDeviceStore((s) => s.insert)
  const focus = useDeviceStore((s) => s.focus)
  /*
   * On a phone the strip is one cartridge at a time — its neighbours, at the
   * edges of a narrow window, were slivers to mis-tap — browsed by a swipe.
   */
  const phone = typeof window !== 'undefined' && window.innerWidth < PHONE_WIDTH
  useEffect(() => {
    if (!phone || mode !== 'BROWSING') return undefined
    let start = null
    const down = (e) => { start = { x: e.clientX, y: e.clientY } }
    const up = (e) => {
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      start = null
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
      const { focusedIndex: at } = useDeviceStore.getState()
      focus(dx < 0 ? at + 1 : at - 1)
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [phone, mode, focus])

  // The mode as of the previous render. Handing the focused cartridge between
  // the strip and the travelling copy must be instant in both directions: the
  // two sit at the identical pose at that moment, so any fade shows either a
  // hole or a double.
  const prevMode = useRef(mode)
  useEffect(() => {
    prevMode.current = mode
  }, [mode])
  const crossedHandoff = ACTIVE_MODES.has(mode) !== ACTIVE_MODES.has(prevMode.current)

  const handleCartridgeClick = useCallback((e, index) => {
    e.stopPropagation()
    // While projecting the strip is faded out, so it must not take clicks.
    if (mode === 'PROJECTING') return
    // Only allow inserting the focused cartridge
    if (index === focusedIndex) {
      insert(index)
    }
  }, [mode, focusedIndex, insert])

  // Nothing to draw unless the strip belongs on screen in this mode.
  if (!STRIP_MODES.has(mode)) return null

  // The projected preview occupies the band the strip sits in, so the strip
  // clears out of shot while it is up and fades back in on eject.
  const stripOpacity = mode === 'PROJECTING' ? 0 : 1

  return (
    <group>
      {PROJECTS.map((project, i) => {
        const n = PROJECTS.length
        // Compute circular offset
        let offset = i - focusedIndex
        if (offset > n / 2)  offset -= n
        if (offset < -n / 2) offset += n

        // Only the focused cartridge and its neighbours — on a phone, only the focused.
        if (Math.abs(offset) > (phone ? 0 : 1)) return null

        const isActiveCartridge = ACTIVE_MODES.has(mode) && i === focusedIndex
        const pose = slotPose(i, focusedIndex, n)

        return (
          <Cartridge
            key={project.id}
            project={project}
            pose={pose}
            opacity={isActiveCartridge ? 0 : pose.opacity * stripOpacity}
            focused={i === focusedIndex && mode === 'BROWSING'}
            delay={FADE_IN_DELAY_MS + Math.abs(offset) * STAGGER_MS}
            immediate={crossedHandoff && i === focusedIndex}
            visible={true}
            onClick={(e) => handleCartridgeClick(e, i)}
          />
        )
      })}
    </group>
  )
}
