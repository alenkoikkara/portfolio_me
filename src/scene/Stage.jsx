import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { PROJECTS } from '../data/projects'
import { PHOTOS } from '../data/photos'
import Cartridge from './Cartridge'
import { Html } from '@react-three/drei'
import useDeviceStore from './useDeviceStore'
import { PHONE_WIDTH } from './cameraFov'
import Device from './Device'
import Carousel from './Carousel'
import ActiveCartridge from './ActiveCartridge'
import Projector from './Projector'
import Gallery from './Gallery'
import AboutView from './AboutView'
import HudGlass from '../story/scene/HudGlass'

/*
 * Modes in which the chip names the focused cartridge beside the device. Not
 * while projecting: then the case is told by a panel on the screen itself
 * (ProjectCase in Overlay.jsx), which a world-anchored label ran off the
 * bottom of. Not on a phone either, where the same panel does it all.
 */
const CHIP_MODES = new Set(['BROWSING', 'INSERTING', 'EJECTING'])

function ProjectChip() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const width = useThree((s) => s.size.width)
  const project = PROJECTS[focusedIndex]

  // A whitelist, like every other mode guard in the scene: the chip belongs to
  // the cartridge arm and nothing else. Asking for "not IDLE and not the
  // gallery" would have printed a project title beside the about panel.
  if (!CHIP_MODES.has(mode) || !project || width < PHONE_WIDTH) return null

  // Anchored by its left edge just past the device's right side, so however
  // long a project's outcome is, it grows away from the keys, not over them.
  return (
    <Html position={[0.075, 0.007, -0.035]} zIndexRange={[100, 0]}>
      <div className="overlay-chip-anchor">
        <div className="overlay-chip">
          <span className="overlay-chip-title">{project.title}</span>
          <span className="overlay-chip-subtitle">{project.subtitle}</span>
        </div>
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
 * It waits for the opening animation to finish, and is also what fetches
 * the cartridge model: nothing preloads it any more, so the page's first
 * load carries only the device. The cartridges sit in a Suspense of their
 * own (below), so the fetch can never blank the device while it runs. It
 * drops out once it has been drawn for a moment — timed from that first
 * draw, not from the intro's end, or a slow fetch would let it expire before
 * ever linking anything.
 */
const WARMUP_POSE = { position: [0, -10, 0], rotation: [0, 0, 0], scale: 1 }
const WARMUP_MS = 1500

/** Mounts only once the model has arrived — Suspense holds it back till then — and so times the warm-up from there. */
function Drawn({ onDrawn }) {
  useEffect(() => {
    const timer = setTimeout(onDrawn, WARMUP_MS)
    return () => clearTimeout(timer)
  }, [onDrawn])
  return null
}

function CartridgeWarmup() {
  const introDone = useDeviceStore((s) => s.introDone)
  const mode = useDeviceStore((s) => s.mode)
  const [spent, setSpent] = useState(false)
  const done = useCallback(() => setSpent(true), [])

  // Once the carousel has opened, the real cartridges hold the programs.
  if (!introDone || spent || mode !== 'IDLE') return null
  return (
    <Suspense fallback={null}>
      <Cartridge project={PROJECTS[0]} pose={WARMUP_POSE} opacity={1} />
      <Drawn onDrawn={done} />
    </Suspense>
  )
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
      {/* Their own boundary: the cartridge model arrives after the device, and must not blank it. */}
      <Suspense fallback={null}>
        <Carousel />
        <ActiveCartridge slotAnchorRef={slotAnchorRef} />
      </Suspense>
      <Projector />
      <ProjectChip />
      <Gallery />
      <AboutView />
      <HudGlass />
    </Suspense>
  )
}
