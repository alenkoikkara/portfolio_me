import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sky } from '../sky'
import useDeviceStore from '../../scene/useDeviceStore'

/** How high above the desk the glint rides, in metres: just over the keycaps. */
const HEIGHT = 0.06
/*
 * About five per cent of the sun's light where it lands. Physically based and
 * this close, so the number is tiny for what it does: what the eye sees is
 * the glossy keycaps' highlight sliding as the pointer moves.
 */
const STRENGTH = 0.00045
const FOLLOW = 12
const FADE = 4
const MAX_STEP = 0.1

/**
 * A faint light that follows the pointer a little above the device, so its
 * keys catch it as the pointer moves. At rest only, and on a desktop — a
 * phone has no hovering pointer to follow (LightingSetup.jsx leaves it out).
 */
export default function CursorGlint() {
  const lightRef = useRef()
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -HEIGHT), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const light = lightRef.current
    const step = Math.min(delta, MAX_STEP)
    const { mode, introDone } = useDeviceStore.getState()
    const on = introDone && mode === 'IDLE'

    if (on) {
      ray.setFromCamera(state.pointer, state.camera)
      if (ray.ray.intersectPlane(plane, hit)) light.position.lerp(hit, 1 - Math.exp(-FOLLOW * step))
    }
    const target = on ? STRENGTH * sky.sample.sunI * sky.light : 0
    light.intensity = THREE.MathUtils.damp(light.intensity, target, FADE, step)
  })

  return <pointLight ref={lightRef} color="#fff8ef" intensity={0} distance={0.25} decay={2} />
}
