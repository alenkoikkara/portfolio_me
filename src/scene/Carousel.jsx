import React, { useCallback } from 'react'
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

/**
 * Compute pose for cartridge at index i, given which index is focused.
 * Cartridges lie flat (label up, contacts towards the slot); neighbours
 * recede slightly and fan outwards.
 */
export function slotPose(i, focusedIndex) {
  const offset = i - focusedIndex
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
 * Visible during BROWSING, INSERTING, PROJECTING, EJECTING.
 * Fades in/out on mode transitions.
 */
export default function Carousel() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const insert = useDeviceStore((s) => s.insert)

  const handleCartridgeClick = useCallback((e, index) => {
    e.stopPropagation()
    // Only allow inserting the focused cartridge
    if (index === focusedIndex) {
      insert(index)
    }
  }, [focusedIndex, insert])

  // Don't render anything in IDLE (after fade out completes)
  if (mode === 'IDLE') return null

  return (
    <group>
      {PROJECTS.map((project, i) => {
        const offset = Math.abs(i - focusedIndex)
        // Skip rendering cartridges beyond ±2 from focus
        const visible = offset <= 2
        // During INSERTING/PROJECTING/EJECTING, hide the active cartridge from carousel
        // (it's being animated independently)
        const isActiveCartridge = (mode === 'INSERTING' || mode === 'PROJECTING' || mode === 'EJECTING') && i === focusedIndex
        const pose = slotPose(i, focusedIndex)

        return (
          <Cartridge
            key={project.id}
            project={project}
            pose={pose}
            opacity={isActiveCartridge ? 0 : pose.opacity}
            focused={i === focusedIndex && mode === 'BROWSING'}
            delay={FADE_IN_DELAY_MS + offset * STAGGER_MS}
            visible={visible && !isActiveCartridge}
            onClick={(e) => handleCartridgeClick(e, i)}
          />
        )
      })}
    </group>
  )
}
