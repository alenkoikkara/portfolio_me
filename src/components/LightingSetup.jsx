import React, { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import useDeviceStore, { GALLERY_MODES } from '../scene/useDeviceStore'
import deviceFade from '../scene/deviceFade'

// Exact 1:1 scale with hichord.js
const S = 1;
export const CONFIG = {
  studio: {
    key:  { size: [1.6*S, 1.2*S], pos: [0.55*S, 1.10*S, 0.85*S], intensity: 9.0, color: '#ffffff' },
    fill: { size: [1.8*S, 1.4*S], pos: [-1.20*S, 0.45*S, 0.35*S], intensity: 1.6, color: '#c9d8ee' },
    rim:  { size: [1.8*S, 0.35*S], pos: [-0.10*S, 0.55*S, -1.15*S], intensity: 7.0, color: '#fff2dc' },
    floor: '#0a0a0b',
    surround: '#131418',
  },

  keyLight:  { position: [0.16*S, 0.26*S, 0.15*S], color: '#fff6ec' },
  rimLight:  { position: [-0.10*S, 0.14*S, -0.22*S], color: '#bfd4f2' },
  fillLight: { position: [-0.22*S, 0.10*S, 0.14*S], color: '#dfe6f0' },

  shadow: {
    size: 0.34*S,
    castOpacity: 0.42,
    contactOpacity: 0.55,
    contactSpread: 1.35,
    mapSize: 2048,
    radius: 4,
  },
}

/*
 * Longest frame the light easing will act on, in seconds.
 *
 * The same cap, for the same reason, as MAX_EASE_STEP on the camera in
 * scene/Device.jsx. These eases are exponential on frame delta, so a single
 * long frame resolves almost the whole change in one step and the room snaps
 * rather than dims. That is not hypothetical here: the frame in which the
 * carousel opens also links every cartridge shader, which is long enough to
 * take the exposure its entire travel at once — measured at a full 1.15 → 0.75
 * in one frame — and it reads as the lights glitching at the moment of a click.
 *
 * Loose on purpose. Anything down to ten frames a second passes through
 * untouched, so only a pathological frame is damped.
 */
const MAX_LIGHT_STEP = 0.1

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

export default function LightingSetup() {
  const { gl, scene } = useThree()
  
  const shadowGroupRef = useRef()
  // Base opacity of each shadow material, so the fade scales what was authored
  // rather than overwriting it.
  const shadowBase = useRef(null)

  const keyLightRef = useRef()
  const rimLightRef = useRef()
  const fillLightRef = useRef()
  
  const mode = useDeviceStore(s => s.mode)

  // Seed to idle values on first mount so useFrame has no gap to snap through
  React.useEffect(() => {
    scene.environmentIntensity = 1.6
    gl.toneMappingExposure = 1.15
  }, [])
  
  useFrame((state, delta) => {
    const step = Math.min(delta, MAX_LIGHT_STEP)
    const inGallery = GALLERY_MODES.has(mode)
    const isProjecting = mode !== 'IDLE'

    /*
     * The gallery is a different room. These three lights are aimed at a device
     * 92 mm across and are directional, so they reach the wall five metres away
     * as well — at full strength they flatten it from head-on and cancel the
     * grazing light the wall hangs its own depth on. They go out, and the wall
     * lights itself. The environment stays part-way up so the prints keep a
     * little reflected room light in them rather than going matte.
     */
    const targetExposure = inGallery ? 1.0 : isProjecting ? 0.75 : 1.15
    const targetEnvIntensity = inGallery ? 0.5 : isProjecting ? 0.6 : 1.6
    const targetKey = inGallery ? 0 : isProjecting ? 1.2 : 3.4
    const targetRim = inGallery ? 0 : isProjecting ? 0.6 : 1.8
    const targetFill = inGallery ? 0 : isProjecting ? 0.15 : 0.45

    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, targetExposure, 4, step)
    
    // Animate environment intensity if supported (R3F environment)
    if (scene.environmentIntensity !== undefined) {
      scene.environmentIntensity = THREE.MathUtils.damp(scene.environmentIntensity, targetEnvIntensity, 4, step)
    }

    if (keyLightRef.current) keyLightRef.current.intensity = THREE.MathUtils.damp(keyLightRef.current.intensity, targetKey, 4, step)
    if (rimLightRef.current) rimLightRef.current.intensity = THREE.MathUtils.damp(rimLightRef.current.intensity, targetRim, 4, step)
    if (fillLightRef.current) fillLightRef.current.intensity = THREE.MathUtils.damp(fillLightRef.current.intensity, targetFill, 4, step)

    /*
     * Take the shadows down with the device.
     *
     * `Device` drives deviceFade in its own frame loop; this only follows it. A
     * device that faded out while its contact shadow stayed printed on the desk
     * would read as a bug, not as a transition — the shadow is part of the
     * object as far as the eye is concerned.
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
      <Environment background={false} resolution={1024}>
        <mesh>
          <sphereGeometry args={[120, 24, 16]} />
          <meshBasicMaterial color={CONFIG.studio.surround} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -18, 0]}>
          <planeGeometry args={[280, 280]} />
          <meshBasicMaterial color={CONFIG.studio.floor} toneMapped={false} />
        </mesh>
        <EnvPanel config={CONFIG.studio.key} />
        <EnvPanel config={CONFIG.studio.fill} />
        <EnvPanel config={CONFIG.studio.rim} />
      </Environment>

      {/* Key Light */}
      <directionalLight
        ref={keyLightRef}
        position={CONFIG.keyLight.position}
        intensity={3.4}
        color={CONFIG.keyLight.color}
        castShadow
        shadow-mapSize-width={CONFIG.shadow.mapSize}
        shadow-mapSize-height={CONFIG.shadow.mapSize}
        shadow-camera-near={0.02}
        shadow-camera-far={0.9}
        shadow-camera-left={-0.3}
        shadow-camera-right={0.3}
        shadow-camera-top={0.3}
        shadow-camera-bottom={-0.3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.002}
        shadow-radius={CONFIG.shadow.radius}
      />

      {/* Rim Light */}
      <directionalLight
        ref={rimLightRef}
        position={CONFIG.rimLight.position}
        intensity={1.8}
        color={CONFIG.rimLight.color}
      />

      {/* Fill Light */}
      <directionalLight
        ref={fillLightRef}
        position={CONFIG.fillLight.position}
        intensity={0.45}
        color={CONFIG.fillLight.color}
      />

      {/* Shadows */}
      <group ref={shadowGroupRef}>
        {/* Directional drop shadow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[CONFIG.shadow.size, CONFIG.shadow.size]} />
          <shadowMaterial opacity={CONFIG.shadow.castOpacity} />
        </mesh>
        
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
