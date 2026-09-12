import React, { useRef } from 'react'
import { Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { PROJECTS } from '../data/projects'
import { Html } from '@react-three/drei'
import useDeviceStore from './useDeviceStore'
import Device from './Device'
import Carousel from './Carousel'
import ActiveCartridge from './ActiveCartridge'
import Projector from './Projector'

function ProjectChip() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const project = PROJECTS[focusedIndex]

  if (mode === 'IDLE' || !project) return null

  const isProjecting = mode === 'PROJECTING'

  // The device's back top edge is roughly at y=0.007, z=-0.015. 
  // We place it at x=0.09 to shift it clearly to the right of the device.
  return (
    <Html position={[0.075, 0.007, -0.035]} center zIndexRange={[100, 0]}>
      <div className="overlay-chip">
        <span className="overlay-chip-title">{project.title}</span>
        <span className="overlay-chip-subtitle">{project.subtitle}</span>
        {project.url && (
          <a
            className={`overlay-chip-link ${isProjecting ? 'overlay-chip-link--visible' : ''}`}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: project.color }}
          >
            visit ↗
          </a>
        )}
      </div>
    </Html>
  )
}

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
      <ProjectChip />
    </Suspense>
  )
}
