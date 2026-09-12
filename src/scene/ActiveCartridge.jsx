import React, { useRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import useDeviceStore from './useDeviceStore'
import { PROJECTS } from '../data/projects'
import { slotPose } from './Carousel'
import cartridgeGlb from '../assets/glb/cartridge.glb'

/* ─── Slot geometry ─── */
// The cartridge is 50 mm long with its contacts on the +Z end. It enters the
// slot mouth on the device's back edge travelling +Z and seats SEAT_DEPTH in,
// leaving the grip end proud of the housing.
const CART_HALF_LENGTH = 0.025
const SEAT_DEPTH = 0.034
const ALIGN_GAP = 0.004
const OVERSHOOT = 0.0012
const LIFT_HEIGHT = 0.015

function carouselWorldPos(index, focusedIndex) {
  return new THREE.Vector3(...slotPose(index, focusedIndex).position)
}

/* ─── Easing helpers ─── */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t) }

/* ─── Animation durations (ms) ─── */
const INSERT_LIFT_MS = 250
const INSERT_SLIDE_MS = 350
const INSERT_SEAT_MS = 220
const INSERT_SNAP_MS = 80
const EJECT_PULL_MS = 200
const EJECT_RETURN_MS = 400

/**
 * ActiveCartridge — renders the single cartridge that is currently
 * being inserted, seated (projecting), or ejected.
 *
 * It manages its own imperative animation loop rather than springs,
 * because the trajectory is multi-stage and needs precise control.
 */
export default function ActiveCartridge({ slotAnchorRef }) {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const activeId = useDeviceStore((s) => s.activeId)
  const seated = useDeviceStore((s) => s.seated)
  const ejected = useDeviceStore((s) => s.ejected)

  const groupRef = useRef()
  const animRef = useRef({
    stage: 'idle',        // 'idle' | 'lift' | 'slide' | 'seat' | 'snap' | 'hold' | 'pull' | 'return' | 'done'
    startTime: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
    carouselPos: new THREE.Vector3(),
    alignZ: 0,
  })

  const { scene } = useGLTF(cartridgeGlb)

  // Find the active project
  const activeProject = useMemo(() => {
    if (!activeId) return null
    return PROJECTS.find(p => p.id === activeId) || null
  }, [activeId])

  // Clone & colorize
  const { instance, labelMat } = useMemo(() => {
    if (!activeProject) return { instance: null, labelMat: null }
    const clone = SkeletonUtils.clone(scene)
    let foundLabelMat = null
    clone.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = false
      o.receiveShadow = false
      o.frustumCulled = false
      o.material = o.material.clone()
      o.material.transparent = true
      o.material.depthWrite = true
      o.material.needsUpdate = true
      if (o.material.name === 'Cartridge_Shell') {
        o.material.color.set(activeProject.color)
        o.material.roughness = 0.88
        o.material.metalness = 0.0
        o.material.envMapIntensity = 0.3
      } else if (o.material.name === 'Cartridge_Text') {
        o.material.color.set(activeProject.inkColor ?? '#181A1C')
        o.material.roughness = 0.92
        o.material.metalness = 0.0
      } else if (o.material.name === 'Cartridge_Label') {
        foundLabelMat = o.material
        o.material.roughness = 0.75
        o.material.metalness = 0.0
      }
    })
    return { instance: clone, labelMat: foundLabelMat }
  }, [scene, activeProject?.id])

  // Apply preview thumbnail to the label area
  useEffect(() => {
    if (!labelMat || !activeProject?.preview) return
    let disposed = false
    new THREE.TextureLoader().load(
      activeProject.preview,
      (tex) => {
        if (disposed) { tex.dispose(); return }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = false
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.generateMipmaps = true
        tex.offset.set(0, 0)
        tex.repeat.set(1, 0.3)
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
  }, [labelMat, activeProject?.preview])

  // ─── Start insertion animation when mode becomes INSERTING ───
  useEffect(() => {
    if (mode !== 'INSERTING' || !groupRef.current) return

    const anim = animRef.current
    const carouselPos = carouselWorldPos(focusedIndex, focusedIndex)
    anim.carouselPos.copy(carouselPos)

    // Position at carousel slot, lying flat with contacts towards the device
    groupRef.current.position.copy(carouselPos)
    groupRef.current.rotation.set(0, 0, 0)

    // Start lift stage: pick the cartridge up towards the camera
    anim.stage = 'lift'
    anim.startTime = performance.now()
    anim.startPos.copy(carouselPos)
    anim.targetPos.copy(carouselPos).add(new THREE.Vector3(0, LIFT_HEIGHT, 0))
  }, [mode === 'INSERTING'])

  // ─── Start ejection animation when mode becomes EJECTING ───
  useEffect(() => {
    if (mode !== 'EJECTING' || !groupRef.current) return

    const anim = animRef.current
    const carouselPos = carouselWorldPos(focusedIndex, focusedIndex)
    anim.carouselPos.copy(carouselPos)

    anim.stage = 'pull'
    anim.startTime = performance.now()
    anim.startPos.copy(groupRef.current.position)
    // Pull target: back out of the slot to the aligned position, then lift
    anim.targetPos.copy(groupRef.current.position).setZ(anim.alignZ).add(new THREE.Vector3(0, LIFT_HEIGHT, 0))
  }, [mode === 'EJECTING'])

  // ─── Frame-by-frame animation ───
  useFrame(() => {
    if (!groupRef.current) return
    const anim = animRef.current
    const elapsed = performance.now() - anim.startTime

    // Slot mouth (world space) and the poses derived from it
    const getMouth = () => {
      if (!slotAnchorRef?.current) return new THREE.Vector3(0, 0.003, -0.049)
      const pos = new THREE.Vector3()
      slotAnchorRef.current.getWorldPosition(pos)
      return pos
    }
    const getAlignPos = () => getMouth().add(new THREE.Vector3(0, 0, -CART_HALF_LENGTH - ALIGN_GAP))
    const getSeatPos = () => getMouth().add(new THREE.Vector3(0, 0, SEAT_DEPTH - CART_HALF_LENGTH))

    switch (anim.stage) {
      case 'lift': {
        const t = Math.min(1, elapsed / INSERT_LIFT_MS)
        const e = easeOutCubic(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          // Fly down to the slot mouth, dropping to slot height on the way
          anim.stage = 'slide'
          anim.startTime = performance.now()
          anim.startPos.copy(groupRef.current.position)
          const align = getAlignPos()
          anim.alignZ = align.z
          anim.targetPos.copy(align)
        }
        break
      }
      case 'slide': {
        const t = Math.min(1, elapsed / INSERT_SLIDE_MS)
        const e = easeInOutCubic(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          // Push into the slot, running a hair past the seat for the detent
          anim.stage = 'seat'
          anim.startTime = performance.now()
          anim.startPos.copy(groupRef.current.position)
          anim.targetPos.copy(getSeatPos()).add(new THREE.Vector3(0, 0, OVERSHOOT))
        }
        break
      }
      case 'seat': {
        const t = Math.min(1, elapsed / INSERT_SEAT_MS)
        const e = easeOutQuad(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          // Snap back onto the detent
          anim.stage = 'snap'
          anim.startTime = performance.now()
          anim.startPos.copy(groupRef.current.position)
          anim.targetPos.copy(getSeatPos())
        }
        break
      }
      case 'snap': {
        const t = Math.min(1, elapsed / INSERT_SNAP_MS)
        const e = easeOutCubic(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          anim.stage = 'hold'
          seated()
        }
        break
      }
      case 'hold':
        // Cartridge stays at slot position while projecting
        break

      case 'pull': {
        const t = Math.min(1, elapsed / EJECT_PULL_MS)
        const e = easeOutCubic(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          anim.stage = 'return'
          anim.startTime = performance.now()
          anim.startPos.copy(groupRef.current.position)
          anim.targetPos.copy(anim.carouselPos)
        }
        break
      }
      case 'return': {
        const t = Math.min(1, elapsed / EJECT_RETURN_MS)
        const e = easeInOutCubic(t)
        groupRef.current.position.lerpVectors(anim.startPos, anim.targetPos, e)
        if (t >= 1) {
          anim.stage = 'idle'
          ejected()
        }
        break
      }
      default:
        break
    }
  })

  // Only render during active states
  const shouldRender = mode === 'INSERTING' || mode === 'PROJECTING' || mode === 'EJECTING'
  if (!shouldRender || !instance) return null

  return (
    <group ref={groupRef} name="ActiveCartridge">
      <primitive object={instance} />
    </group>
  )
}

useGLTF.preload(cartridgeGlb)
