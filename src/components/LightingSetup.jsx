import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import useDeviceStore from '../scene/useDeviceStore'
import deviceFade from '../scene/deviceFade'
import SkyDriver, { envIntensityFor } from '../story/scene/SkyDriver'
import ShadowCatcher from '../story/scene/ShadowCatcher'
import Blinds from '../story/scene/Blinds'
import TrainPass from '../story/scene/TrainPass'
import CursorGlint from '../story/scene/CursorGlint'
import { isMobile } from '../story/environment'

const MOBILE = isMobile()

// Exact 1:1 scale with hichord.js
const S = 1;
/*
 * The studio the device's reflections come from. It is only ever an
 * environment map now — the light itself is the sky's (story/scene/SkyDriver)
 * — so these panels set what the glossy keycaps and housing reflect, and the
 * sky sets how strongly.
 */
const STUDIO = {
  key:  { size: [1.6*S, 1.2*S], pos: [0.55*S, 1.10*S, 0.85*S], intensity: 9.0, color: '#ffffff' },
  fill: { size: [1.8*S, 1.4*S], pos: [-1.20*S, 0.45*S, 0.35*S], intensity: 1.6, color: '#c9d8ee' },
  rim:  { size: [1.8*S, 0.35*S], pos: [-0.10*S, 0.55*S, -1.15*S], intensity: 7.0, color: '#fff2dc' },
  floor: '#0a0a0b',
  surround: '#131418',
}

const EnvPanel = ({ config }) => (
  <mesh position={config.pos} onUpdate={m => m.lookAt(0,0,0)}>
    <planeGeometry args={config.size} />
    <meshBasicMaterial 
      color={new THREE.Color(config.color).multiplyScalar(config.intensity)} 
      side={THREE.DoubleSide} 
      toneMapped={false} 
    />
  </mesh>
)

/**
 * The room: the studio environment the device reflects, the sky's light
 * (SkyDriver), the ground its shadow falls on (ShadowCatcher), and a soft
 * contact shadow that keeps it sitting on that ground whatever the sun does.
 */
export default function LightingSetup() {
  const shadowGroupRef = useRef()
  // Base opacity of each shadow material, so the fade scales what was authored
  // rather than overwriting it.
  const shadowBase = useRef(null)

  const mode = useDeviceStore(s => s.mode)

  useFrame(() => {
    /*
     * Take the contact shadow down with the device.
     *
     * `Device` drives deviceFade in its own frame loop; this only follows it. A
     * device that faded out while its contact shadow stayed printed on the desk
     * would read as a bug, not as a transition — the shadow is part of the
     * object as far as the eye is concerned. (The sun's shadow does the same,
     * in ShadowCatcher.)
     */
    if (shadowGroupRef.current) {
      if (!shadowBase.current) {
        const seen = new Map()
        shadowGroupRef.current.traverse((o) => {
          if (o.isMesh && o.material) seen.set(o.material, o.material.opacity)
        })
        shadowBase.current = [...seen].map(([material, opacity]) => ({ material, opacity }))
      }
      for (const { material, opacity } of shadowBase.current) {
        material.opacity = opacity * deviceFade.value
      }
      shadowGroupRef.current.visible = deviceFade.value > 0
    }
  })

  return (
    <>
      {/* SoftShadows disabled — PCSS patches cause unpackRGBAToDepth GLSL
          errors when cartridge materials (KHR_texture_transform) enter the scene.
          Regular shadow maps with radius 4 are adequate. */}
      <Environment
        background={false}
        resolution={1024}
        environmentIntensity={envIntensityFor(mode)}
      >
        <mesh>
          <sphereGeometry args={[120, 24, 16]} />
          <meshBasicMaterial color={STUDIO.surround} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -18, 0]}>
          <planeGeometry args={[280, 280]} />
          <meshBasicMaterial color={STUDIO.floor} toneMapped={false} />
        </mesh>
        <EnvPanel config={STUDIO.key} />
        <EnvPanel config={STUDIO.fill} />
        <EnvPanel config={STUDIO.rim} />
      </Environment>

      <SkyDriver />
      <ShadowCatcher />
      {/*
        * Not on a phone at all, not merely switched off. A light at zero
        * intensity is still a light every lit material loops over in its
        * shader; and at a phone's halved shadow map the blinds' thin stripes
        * alias into a sparkle rather than reading as light through slats.
        */}
      {!MOBILE && (
        <>
          <Blinds />
          <TrainPass />
          <CursorGlint />
        </>
      )}

      <group ref={shadowGroupRef}>
        {/* Realistic shape-matching contact shadow with dispersion */}
        <ContactShadows 
          position={[0, 0, 0]} 
          opacity={0.8} 
          scale={0.4} 
          blur={3.5} 
          far={0.05} 
          resolution={512}
          color="#000000"
        />
      </group>
    </>
  )
}
