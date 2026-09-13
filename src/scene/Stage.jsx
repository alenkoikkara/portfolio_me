import React, { useEffect, useRef, useState } from 'react'
import { Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { PROJECTS } from '../data/projects'
import { PHOTOS } from '../data/photos'
import Cartridge from './Cartridge'
import { Html } from '@react-three/drei'
import useDeviceStore, { GALLERY_MODES } from './useDeviceStore'
import Device from './Device'
import Carousel from './Carousel'
import ActiveCartridge from './ActiveCartridge'
import Projector from './Projector'
import Gallery from './Gallery'

function ProjectChip() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const project = PROJECTS[focusedIndex]

  if (mode === 'IDLE' || GALLERY_MODES.has(mode) || !project) return null

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
/*
 * Compile the cartridge shaders before anything asks to see them.
 *
 * Every cartridge material reaches the scene in the one frame the carousel
 * opens, and a driver cannot draw a material until its program has linked.
 * That link is what stalls the transition — it dominates a CPU profile of the
 * open — and it lands exactly where the camera is mid-glide.
 *
 * So one cartridge is drawn out of shot beforehand, far below the device,
 * which forces the same programs to link while nothing is moving. A pause
 * there is invisible; the same pause during the glide is what looked glitchy.
 * The other cartridges reuse the compiled programs.
 *
 * It waits for the opening animation to finish, since that is the earliest a
 * visitor can reach the projects key, and drops out once it has had time to
 * draw a frame or two.
 */
const WARMUP_POSE = { position: [0, -10, 0], rotation: [0, 0, 0], scale: 1 }
const WARMUP_MS = 1500

function CartridgeWarmup() {
  const introDone = useDeviceStore((s) => s.introDone)
  const mode = useDeviceStore((s) => s.mode)
  const [spent, setSpent] = useState(false)

  useEffect(() => {
    if (!introDone || spent) return undefined
    const timer = setTimeout(() => setSpent(true), WARMUP_MS)
    return () => clearTimeout(timer)
  }, [introDone, spent])

  // Once the carousel has opened, the real cartridges hold the programs.
  if (!introDone || spent || mode !== 'IDLE') return null
  return <Cartridge project={PROJECTS[0]} pose={WARMUP_POSE} opacity={1} />
}

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
    window.PHOTO_IDS = PHOTOS.map((p) => p.id)
  }

  /*
   * Let shader programs link without blocking the frame.
   *
   * After every link three asks the driver for the program's info log, and
   * that question forces the driver to finish linking before it can answer.
   * The cartridge materials all reach the scene in the single frame the
   * carousel opens, so the whole batch links synchronously there and the
   * transition stutters. Skipping the log lets drivers link in parallel and
   * hands the frame back immediately.
   *
   * The log is how a broken shader reports itself, and this scene has custom
   * GLSL, so the check stays on in development and is only skipped in builds.
   */
  useEffect(() => {
    gl.debug.checkShaderErrors = import.meta.env.DEV
  }, [gl])

  return (
    <Suspense fallback={null}>
      <Device slotAnchorRef={slotAnchorRef} />
      <CartridgeWarmup />
      <Carousel />
      <ActiveCartridge slotAnchorRef={slotAnchorRef} />
      <Projector />
      <ProjectChip />
      <Gallery />
    </Suspense>
  )
}
