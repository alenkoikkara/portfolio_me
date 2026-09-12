import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useDeviceStore from './useDeviceStore'
import { PROJECTS } from '../data/projects'
import usePreviewTexture from './usePreviewTexture'
import { makeBeamMaterial, makeNoiseTexture, makePreviewMaterial } from './projectorShaders'

/* ─── Placement ─── */
// The open camera looks straight down, so the preview lies flat and fills the
// band the carousel vacates while projecting. Its near edge clears the back of
// the housing, where the lens is.
const PLANE_POS = [0, 0.065, -0.155]
const PLANE_SIZE = [0.235, 0.15]
// LensAnchor's world position. The device never moves, so this is a constant.
const LENS_POS = [-0.032, 0.007, -0.054]

/* ─── Boot beat (ms) ─── */
// Dark, then a single bright frame, then the image fades up. Without the dark
// beat the insertion just cuts to a picture; with it, the projector warms up.
const DARK_MS = 400
const FLASH_MS = 90
const FADE_IN_MS = 520
const FADE_OUT_MS = 340

/* ─── Scroll ─── */
// Seconds to travel the screenshot once. The window shows 30% of the page, so
// the visible range of the offset is 1 - 0.3.
const SCROLL_PERIOD = 40
const WINDOW = 0.3
const SCROLL_RANGE = 1 - WINDOW

/** Modes in which the preview texture is worth holding in memory. */
const LIVE_MODES = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])

/**
 * Projector — the payoff once a cartridge seats. A tall screenshot of the
 * project scrolls on a plane of projected light, with a dusty beam running
 * back to the lens on the device's back edge.
 */
export default function Projector() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const project = PROJECTS[focusedIndex]

  const isProjecting = mode === 'PROJECTING'
  const live = LIVE_MODES.has(mode)
  const texture = usePreviewTexture(project?.preview, live)

  const noise = useMemo(() => makeNoiseTexture(), [])
  const previewMaterial = useMemo(() => makePreviewMaterial(noise), [noise])
  const beamMaterial = useMemo(() => makeBeamMaterial(noise), [noise])

  useEffect(() => () => {
    noise.dispose()
    previewMaterial.dispose()
    beamMaterial.dispose()
  }, [noise, previewMaterial, beamMaterial])

  useEffect(() => {
    previewMaterial.uniforms.uMap.value = texture
    return () => {
      previewMaterial.uniforms.uMap.value = null
    }
  }, [previewMaterial, texture])

  // Beam frustum: a cone from the lens out to the plane, oriented by rotating
  // the cylinder's own +Y axis onto the lens-to-plane direction.
  const beam = useMemo(() => {
    const from = new THREE.Vector3(...LENS_POS)
    const to = new THREE.Vector3(...PLANE_POS)
    const delta = to.clone().sub(from)
    const length = delta.length()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize()
    )
    return {
      length,
      position: from.clone().add(delta.multiplyScalar(0.5)),
      quaternion,
    }
  }, [])

  // The spot light needs a target object that is actually in the scene.
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...PLANE_POS)
    return o
  }, [])

  const spotRef = useRef()
  const bounceRef = useRef()

  // Boot timeline state. `from` records the opacity at the moment the
  // projector was switched off, so the fade out starts wherever it was.
  const boot = useRef({ on: false, start: 0, from: 0 })
  const opacityRef = useRef(0)

  useEffect(() => {
    boot.current = {
      on: isProjecting,
      start: performance.now(),
      from: opacityRef.current,
    }
  }, [isProjecting])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const elapsed = performance.now() - boot.current.start

    let opacity = 0
    let flash = 0

    if (boot.current.on) {
      opacity = Math.min(1, elapsed / FADE_IN_MS)
    } else {
      opacity = Math.max(0, boot.current.from * (1 - elapsed / FADE_OUT_MS))
    }
    opacityRef.current = opacity

    // Scroll the window down the page, dipping to black at the wrap so the
    // jump from the bottom of the page back to the top is never seen.
    const cycle = (t % SCROLL_PERIOD) / SCROLL_PERIOD
    const wrapFade =
      Math.min(1, cycle / 0.04) * (1 - THREE.MathUtils.smoothstep(cycle, 0.95, 1))

    // Shutter flicker: real projectors dim for a frame as the blade passes.
    const flicker = Math.sin(t * 60) > 0.98 ? 0.7 : 1

    const u = previewMaterial.uniforms
    u.uTime.value = t
    u.uOpacity.value = opacity
    u.uFlash.value = flash
    u.uBrightness.value = flicker * wrapFade
    u.uOffset.value.y = SCROLL_RANGE * (1 - cycle)

    const strength = Math.max(opacity, flash)
    beamMaterial.uniforms.uTime.value = t
    beamMaterial.uniforms.uStrength.value = strength

    // Spill: the beam itself lights the air, these light the scene it sits in.
    if (spotRef.current) spotRef.current.intensity = strength * 0.05
    if (bounceRef.current) bounceRef.current.intensity = strength * 0.015
  })

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!isProjecting || !project?.url) return
    window.open(project.url, '_blank', 'noopener,noreferrer')
  }

  const handlePointerOver = (e) => {
    e.stopPropagation()
    if (isProjecting) document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    document.body.style.cursor = 'auto'
  }

  if (!project || !live || !texture) return null

  return (
    <group name="Projector">
      {/* Projected image. Unlit: it is light, not a surface catching light. */}
      <mesh
        position={PLANE_POS}
        rotation={[-Math.PI / 2, 0, 0]}
        material={previewMaterial}
        renderOrder={5}
        onClick={handleOpen}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={PLANE_SIZE} />
      </mesh>

      {/* The cone of hazy air between lens and image. Drawn last, writes no depth. */}
      <mesh
        position={beam.position}
        quaternion={beam.quaternion}
        material={beamMaterial}
        renderOrder={10}
        raycast={() => null}
      >
        <cylinderGeometry args={[0.065, 0.004, beam.length, 32, 1, true]} />
      </mesh>

      {/* Spill, so the projector sits in the scene rather than on top of it. */}
      <primitive object={spotTarget} />
      <spotLight
        ref={spotRef}
        position={LENS_POS}
        target={spotTarget}
        angle={0.75}
        penumbra={1}
        distance={0.45}
        decay={2}
        color="#eaf2ff"
      />
      <pointLight
        ref={bounceRef}
        position={[0, 0.035, -0.1]}
        distance={0.16}
        decay={2}
        color={project.color}
      />
    </group>
  )
}
