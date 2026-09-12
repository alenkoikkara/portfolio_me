import React, { useRef } from 'react'
import { Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { PROJECTS } from '../data/projects'
import Device from './Device'
import Carousel from './Carousel'
import ActiveCartridge from './ActiveCartridge'
import Projector from './Projector'

/**
 * Stage — orchestrator component rendered inside Canvas.
 * Composes Device, Carousel, ActiveCartridge, and Projector, passing shared refs.
 */
export default function Stage() {
  const slotAnchorRef = useRef()

  // Exposed in development so GPU texture counts can be checked while
  // switching projects, which is where preview textures would leak.
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  if (import.meta.env.DEV) {
    window.__gl = gl
    window.__scene = scene
    window.__camera = camera
    window.PROJECT_IDS = PROJECTS.map((p) => p.id)
  }

  return (
    <Suspense fallback={null}>
      <Device slotAnchorRef={slotAnchorRef} />
      <Carousel />
      <ActiveCartridge slotAnchorRef={slotAnchorRef} />
      <Projector />
    </Suspense>
  )
}
