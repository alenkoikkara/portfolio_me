import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { sky } from '../sky'
import deviceFade from '../../scene/deviceFade'

/** Wide enough for a 15 mm device's shadow with the sun four degrees up: about 21 cm long. */
const SIZE = 1.5

/**
 * The ground the sun's shadow falls on: invisible except for the shadow, so the
 * sky behind the canvas shows through everywhere else, and the device's shadow
 * swings and stretches across it as the sun moves.
 *
 * On a page that stays white, the shadow tells the hour more than anything
 * else: its tint and strength come from the sky's keys — warm brown at sunrise
 * and golden hour, neutral at noon, faint blue-grey under the moon — and it is
 * gone with the device when it fades, since a shadow left printed on the desk
 * after its object has gone reads as a bug.
 */
export default function ShadowCatcher() {
  const meshRef = useRef()
  const matRef = useRef()

  useFrame(() => {
    const s = sky.sample
    matRef.current.opacity = s.shadowA * sky.light * deviceFade.value
    matRef.current.color.copy(s.shadow)
    meshRef.current.visible = deviceFade.value > 0
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
      <planeGeometry args={[SIZE, SIZE]} />
      <shadowMaterial ref={matRef} transparent depthWrite={false} />
    </mesh>
  )
}
