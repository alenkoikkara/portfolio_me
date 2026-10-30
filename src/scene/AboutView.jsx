import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import useDeviceStore from './useDeviceStore'
import useAboutMode from './useAboutMode'
import { aboutLayout } from './aboutLayout'
import LiquidGlass from './LiquidGlass'
import Constellation from './Constellation'
import { MILESTONES } from './about/timeline'
import AboutPanel from './AboutPanel'

const GLASS_SECONDS = 0.35
/** Longest frame the fade will act on, so one stalled frame cannot skip it. */
const MAX_STEP = 0.1

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * The about view: a pane of frosted glass over the scene, blurring the device
 * away, with a constellation of milestones on it and the bio beside that.
 *
 * It is a page over the scene rather than part of it, so it rides with the
 * camera: the group below copies the camera's pose every frame, and everything
 * in it is placed in camera space from screen pixels (aboutLayout.js). It fills
 * the frame exactly wherever the camera happens to be.
 *
 * The glass's fade is what moves the mode on — OPENING_ABOUT to ABOUT once it
 * is up, CLOSING_ABOUT to IDLE once it is gone — the same rule as everywhere
 * else: the animation reports that it finished, not a timer.
 */
export default function AboutView() {
  const { inAbout, present } = useAboutMode()
  const aboutOpened = useDeviceStore((s) => s.aboutOpened)
  const aboutClosed = useDeviceStore((s) => s.aboutClosed)

  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const layout = useMemo(() => aboutLayout(width, height, MILESTONES.length), [width, height])

  const rigRef = useRef()
  const contentRef = useRef()
  const opacity = useRef(0)

  useFrame((state, delta) => {
    const rig = rigRef.current
    if (!rig) return

    /*
     * Mounted after the device, so this runs after the device has placed the
     * camera this frame — the glass and the text are never a frame behind it.
     */
    rig.position.copy(state.camera.position)
    rig.quaternion.copy(state.camera.quaternion)

    // A crossfade between the scene and the glass in front of it: at zero the
    // device is sharp, at one it is only what the frost lets through.
    const target = present ? 1 : 0
    const travel = prefersReducedMotion() ? 1 : Math.min(delta, MAX_STEP) / GLASS_SECONDS
    opacity.current = target > opacity.current
      ? Math.min(target, opacity.current + travel)
      : Math.max(target, opacity.current - travel)

    if (present && opacity.current === 1) aboutOpened()
    if (!present && opacity.current === 0) aboutClosed()
  })

  /*
   * The glass takes the pointer, so nothing behind it does. The device's keys
   * are still in the scene under it, and without this a click on the bio's
   * empty margin would press whichever key happened to be behind — the social
   * keys would open links from under the glass.
   */
  const swallow = (e) => e.stopPropagation()

  if (!inAbout) return null

  return (
    <group ref={rigRef}>
      <LiquidGlass
        glass={layout.glass}
        opacity={opacity}
        hide={contentRef}
        onPointerOver={swallow}
        onPointerMove={swallow}
        onPointerDown={swallow}
        onClick={swallow}
      />
      <group ref={contentRef}>
        <Constellation layout={layout} present={present} />
      </group>
      <AboutPanel layout={layout} present={present} />
    </group>
  )
}
