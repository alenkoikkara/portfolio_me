import React, { useMemo, useRef, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useSpring, animated as a } from '@react-spring/three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MathUtils } from 'three'
import cartridgeGlb from '../assets/glb/cartridge.glb'

/* ─── Idle rotation (focused cartridge only) ─── */
// A slight counter-tilt about X, so the roll below reads as a turn in space
// rather than a flat wobble.
const SWAY_ANGLE = 0.05
const SWAY_SPEED = 0.85
// Rotation about Z: the cartridge rolls, lifting one long edge towards the
// camera and dropping the other. It swings through +/- ROLL_ANGLE instead of
// turning full circle, which would leave it edge-on and label-down half the
// time. ROLL_SPEED is radians per second, so a full swing every ~11 s.
const ROLL_ANGLE = 0.34
const ROLL_SPEED = 0.55
// Rate at which the rotation eases in and out as focus moves, per second.
const ROTATION_EASE = 4

/** Stable per-project phase so no two cartridges ever drift into lockstep. */
function phaseOf(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000
  return (h / 1000) * Math.PI * 2
}

/**
 * Single cartridge instance. Clones the master cartridge mesh
 * and applies per-project color to Cartridge_Shell material.
 *
 * Props:
 *   project   — { id, title, color, inkColor }
 *   pose      — { position, rotation, scale }
 *   opacity   — 0–1
 *   focused   — whether this is the cartridge in view (drives the idle float)
 *   delay     — ms before the mount fade-in starts (stagger)
 *   onClick   — called when this cartridge is clicked
 *   visible   — whether to render at all
 */
export default function Cartridge({ project, pose, opacity, focused = false, delay = 0, onClick, visible = true }) {
  const { scene } = useGLTF(cartridgeGlb)
  const groupRef = useRef()
  // Inner group carries the idle rotation so it never fights the pose spring.
  const floatRef = useRef()
  const rotationAmount = useRef(0)
  const phase = useMemo(() => phaseOf(project.id), [project.id])

  // Clone master mesh and materials per instance so color changes don't leak
  const instance = useMemo(() => {
    const clone = SkeletonUtils.clone(scene)
    clone.traverse((o) => {
      if (!o.isMesh) return
      // No shadow interaction — SoftShadows PCSS patches cause GLSL compile errors
      // on the Cartridge_Shell material (unpackRGBAToDepth mismatch)
      o.castShadow = false
      o.receiveShadow = false
      o.frustumCulled = false
      o.material = o.material.clone()
      const m = o.material
      m.transparent = true
      m.depthWrite = true
      m.needsUpdate = true

      if (m.name === 'Cartridge_Shell') {
        m.color.set(project.color)
      } else if (m.name === 'Cartridge_Text') {
        m.color.set(project.inkColor ?? '#181A1C')
      }
    })
    return clone
  }, [scene, project.id])

  // Spring-animate pose changes; on mount the cartridge fades in and settles
  // down from slightly above its slot.
  const spring = useSpring({
    from: {
      position: [pose.position[0], pose.position[1] + 0.03, pose.position[2] - 0.02],
      opacity: 0,
    },
    position: pose.position,
    rotation: pose.rotation,
    scale: [pose.scale, pose.scale, pose.scale],
    opacity,
    delay,
    // The focused cartridge settles with a slight overshoot as focus lands on it.
    config: focused ? { tension: 260, friction: 18 } : { tension: 200, friction: 26 },
  })

  // Sync opacity to cloned materials each frame (springs can't reach into cloned
  // materials), and drive the idle rotation of the focused cartridge.
  useFrame((state, delta) => {
    if (!instance) return
    const currentOpacity = spring.opacity.get()
    instance.traverse((o) => {
      if (o.isMesh) {
        o.material.opacity = currentOpacity
      }
    })

    if (!floatRef.current) return
    // Ease the rotation in and out so a cartridge losing focus comes to rest.
    rotationAmount.current = MathUtils.lerp(
      rotationAmount.current,
      focused ? 1 : 0,
      1 - Math.exp(-delta * ROTATION_EASE)
    )
    const amount = rotationAmount.current
    const t = state.clock.elapsedTime
    floatRef.current.rotation.x = Math.cos(t * SWAY_SPEED * 0.7 + phase) * SWAY_ANGLE * amount
    floatRef.current.rotation.z = Math.sin(t * ROLL_SPEED + phase) * ROLL_ANGLE * amount
  })

  // Pointer interaction
  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation()
    document.body.style.cursor = 'auto'
  }, [])

  if (!visible) return null

  return (
    <a.group
      ref={groupRef}
      position={spring.position}
      rotation={spring.rotation}
      scale={spring.scale}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={floatRef}>
        <primitive object={instance} />
      </group>
    </a.group>
  )
}

useGLTF.preload(cartridgeGlb)
