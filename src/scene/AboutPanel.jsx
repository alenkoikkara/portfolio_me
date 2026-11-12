import React, { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import AboutContent from './about/AboutContent'

/** The column arrives once the glass has started to come up, and leaves at once. */
const FADE_IN_DELAY = 0.22
const FADE_SECONDS = 0.35
/** Longest frame the fade will act on, so one stalled frame cannot skip it. */
const MAX_FADE_STEP = 0.1

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * The bio: a column of real DOM text on the about view's glass, through drei's
 * `<Html transform>`, inside AboutView's camera-riding group.
 *
 * It faces the camera (`sprite`) at a scale where one CSS pixel is one screen
 * pixel — see aboutLayout.js. At any other scale its text would be resampled,
 * and soft.
 */
export default function AboutPanel({ layout, present }) {
  const { panel } = layout

  const anchorRef = useRef()
  const columnRef = useRef()
  const opacity = useRef(0)
  const waited = useRef(0)

  /*
   * A linear fade from the frame loop, written straight to the element. A
   * spring read during render would not re-render as it moves, and React
   * state would re-render the whole panel every frame of the fade.
   */
  useFrame((_, delta) => {
    const anchor = anchorRef.current
    const column = columnRef.current
    if (!anchor || !column) return
    const instant = prefersReducedMotion()
    const step = Math.min(delta, MAX_FADE_STEP)

    if (!present) waited.current = 0
    else if (opacity.current === 0 && !instant && waited.current < FADE_IN_DELAY) {
      waited.current += step
      return
    }

    const target = present ? 1 : 0
    const travel = instant ? 1 : step / FADE_SECONDS
    opacity.current = target > opacity.current
      ? Math.min(target, opacity.current + travel)
      : Math.max(target, opacity.current - travel)

    anchor.style.opacity = String(opacity.current)
    /*
     * Links only answer once the column is fully there — never while it is
     * still a ghost on its way in or out. Set on the column itself: a child's
     * `pointer-events: auto` overrides its parent's `none`, so gating the
     * fading wrapper would not have gated the links.
     */
    column.style.pointerEvents = present && opacity.current === 1 ? 'auto' : 'none'
  })

  return (
    <group position={panel.position}>
      <Html
        transform
        sprite
        distanceFactor={panel.distanceFactor}
        /*
         * drei sizes its wrapper to the whole canvas. Left to take the pointer,
         * it would sit over the page and swallow the clicks meant for the
         * overlay's close button. The column takes it back for itself.
         */
        pointerEvents="none"
        // Below the overlay's title and close button, which sit over the scene.
        zIndexRange={[10, 0]}
      >
        {/*
          * drei centres whatever it is given on the anchor point. A zero-sized
          * anchor with the column hung off it puts the anchor where
          * aboutLayout.js means it: the column's left edge beside the device,
          * or its top centre beneath it.
          */}
        <div
          className="relative h-0 w-0"
          ref={anchorRef}
          style={{ opacity: 0 }}
        >
          <div
            className={`absolute left-0 top-0 box-border overflow-y-auto ${panel.anchor === 'side' ? '-translate-y-1/2' : '-translate-x-1/2'}`}
            ref={columnRef}
            style={{ width: panel.width, maxHeight: panel.maxHeight, pointerEvents: 'none' }}
          >
            <AboutContent />
          </div>
        </div>
      </Html>
    </group>
  )
}
