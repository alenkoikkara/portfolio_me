import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring, animated as a } from '@react-spring/three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MathUtils } from 'three'
import * as THREE from 'three'
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
 *   delay     — ms before the first appearance starts (stagger)
 *   immediate — apply the next change with no animation at all
 *   onClick   — called when this cartridge is clicked
 *   visible   — whether to render at all
 */
export default function Cartridge({ project, pose, opacity, focused = false, delay = 0, immediate = false, onClick, visible = true }) {
  const { scene } = useGLTF(cartridgeGlb)
  const groupRef = useRef()
  // Inner group carries the idle rotation so it never fights the pose spring.
  const floatRef = useRef()
  const rotationAmount = useRef(0)
  // The stagger is an entrance effect. Once this cartridge has been seen it
  // must never replay it, or returning from the slot reads as a disappearance.
  const [appeared, setAppeared] = useState(false)
  const phase = useMemo(() => phaseOf(project.id), [project.id])

  // Clone master mesh and materials per instance so color changes don't leak
  const { instance, labelMat } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene)
    let foundLabelMat = null
    clone.traverse((o) => {
      if (!o.isMesh) return
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
        m.roughness = 0.88
        m.metalness = 0.0
        m.envMapIntensity = 0.3
      } else if (m.name === 'Cartridge_Text') {
        m.color.set(project.inkColor ?? '#181A1C')
        m.roughness = 0.92
        m.metalness = 0.0
      } else if (m.name === 'Cartridge_Label') {
        foundLabelMat = m
        m.roughness = 0.75
        m.metalness = 0.0
      }
    })
    return { instance: clone, labelMat: foundLabelMat }
  }, [scene, project.id])

  /*
   * Load the preview texture and apply it to the label area.
   *
   * It is uploaded to the GPU the moment it decodes rather than being left for
   * the first frame that draws it. These are the full tall screenshots, so three
   * of them arriving in the single frame the carousel opens means three large
   * uploads and three mipmap builds in the frame where the camera is mid-glide —
   * which is the stutter. Decodes land whenever they land; the transition frame
   * should not be paying for them.
   */
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!labelMat || !project.preview) return
    let disposed = false
    const loader = new THREE.TextureLoader()
    loader.load(
      project.preview,
      (tex) => {
        if (disposed) { tex.dispose(); return }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = false
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.generateMipmaps = true
        // Calculate cover-style cropping so images aren't squished
        const imgAspect = tex.image.width / tex.image.height
        const labelAspect = 1.333 // Approximate aspect ratio of the physical label

        let repeatX = 1
        let repeatY = 1
        let offsetX = 0
        let offsetY = 0

        if (imgAspect > labelAspect) {
          // Image is wider than label -> crop sides
          repeatX = labelAspect / imgAspect
          offsetX = (1 - repeatX) / 2 // center horizontally
        } else {
          // Image is taller than label -> crop bottom (since flipY = false, 0 is top)
          repeatY = imgAspect / labelAspect
          offsetY = 0 // start at top
        }

        tex.offset.set(offsetX, offsetY)
        tex.repeat.set(repeatX, repeatY)
        gl.initTexture(tex)
        labelMat.map = tex
        labelMat.needsUpdate = true
      }
    )
    return () => {
      disposed = true
      if (labelMat.map) {
        labelMat.map.dispose()
        labelMat.map = null
        labelMat.needsUpdate = true
      }
    }
  }, [labelMat, project.preview, gl])

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
    delay: appeared ? 0 : delay,
    immediate,
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
    // Drop out of the scene once faded: the contact shadow pass renders depth
    // and ignores opacity, so a fully transparent cartridge would still cast.
    // Stay in the scene while the target says so, and while a fade-out is
    // still running. Only a cartridge that is both told to be gone and has
    // finished fading leaves, because the contact shadow pass renders depth
    // and would otherwise keep casting for one that is invisible.
    if (groupRef.current) groupRef.current.visible = opacity > 0.01 || currentOpacity > 0.01
    if (!appeared && currentOpacity > 0.01) setAppeared(true)

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
      name={`Cartridge_${project.id}`}
      visible={opacity > 0.01}
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
