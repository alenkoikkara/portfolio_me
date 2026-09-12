import React, { useCallback, useEffect, useRef } from 'react'
import Cartridge from './Cartridge'
import useDeviceStore from './useDeviceStore'
import { PROJECTS } from '../data/projects'

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

/** Modes in which one cartridge is out of the strip, travelling or seated. */
const ACTIVE_MODES = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])

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

  // Don't render anything in IDLE (after fade out completes)
  if (mode === 'IDLE') return null

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

        // Only render the focused cartridge and immediate neighbours (3 total)
        if (Math.abs(offset) > 1) return null

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
