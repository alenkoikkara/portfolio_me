import React, { useRef } from 'react'
import { Suspense } from 'react'
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

  return (
    <Suspense fallback={null}>
      <Device slotAnchorRef={slotAnchorRef} />
      <Carousel />
      <ActiveCartridge slotAnchorRef={slotAnchorRef} />
      <Projector />
    </Suspense>
  )
}
