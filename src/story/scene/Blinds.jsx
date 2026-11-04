import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sky } from '../sky'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'

const SLATS = 16
/** Slat pitch, in metres: a venetian blind's, scaled to a 92 mm device. */
const GAP = 0.012
/** How far toward the sun the blind hangs: between it and the device, so only its shadow reaches the desk. */
const DISTANCE = 0.18
/*
 * Nearly edge-on to the light: thin stripes. At 1.3 rad, as first drafted, each
 * slat still blocked a quarter of its pitch and the stripes read as heavy
 * bars across the whole window; this close to edge-on they are hairlines.
 */
const OPEN = 1.45
/** Nearly flat: the stripes merge into shade. */
const CLOSED = 0.12
const TILT_RATE = 3.5
const MAX_STEP = 0.1

/** Closed while a cartridge seats and its preview is thrown, like settling in to watch. */
const CLOSED_MODES = new Set(['INSERTING', 'PROJECTING'])

/**
 * The projects chapter's midday light through venetian blinds: slats that are
 * never drawn (`colorWrite` off) but still cast shadows, so only their thin
 * stripes appear, across the device and the desk.
 *
 * One instanced mesh, not twenty-two: a mesh that draws nothing still costs a
 * draw call in every pass. It takes no clicks — slats hanging between the
 * light and the device would otherwise sit in front of the keys and swallow
 * them. Outside the chapter the group is hidden, which takes the shadows too.
 */
export default function Blinds() {
  const groupRef = useRef()
  const meshRef = useRef()
  const tilt = useRef(OPEN)
  const inProjects = useStoryStore((s) => s.chapter === 'projects')
  const closed = useDeviceStore((s) => CLOSED_MODES.has(s.mode))

  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    axis: new THREE.Vector3(1, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
  }), [])

  useFrame((_, delta) => {
    const group = groupRef.current
    const mesh = meshRef.current
    group.visible = inProjects
    if (!inProjects) return
    group.position.copy(sky.sample.sunDir).multiplyScalar(DISTANCE)
    group.lookAt(0, 0, 0)
    tilt.current = THREE.MathUtils.damp(tilt.current, closed ? CLOSED : OPEN, TILT_RATE, Math.min(delta, MAX_STEP))
    const { matrix, position, rotation, axis, scale } = scratch
    rotation.setFromAxisAngle(axis, tilt.current)
    for (let i = 0; i < SLATS; i++) {
      position.set(0, (i - SLATS / 2) * GAP, 0)
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale))
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, SLATS]} castShadow frustumCulled={false} raycast={() => null}>
        {/* About two and a half device-widths across: the stripes fall around
            the device, not across the whole window. */}
        <boxGeometry args={[0.24, 0.0125, 0.0006]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
