import React, { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import useDeviceStore from '../scene/useDeviceStore'

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
    const isProjecting = mode !== 'IDLE'
    
    const targetExposure = isProjecting ? 0.75 : 1.15
    const targetEnvIntensity = isProjecting ? 0.6 : 1.6
    const targetKey = isProjecting ? 1.2 : 3.4
    const targetRim = isProjecting ? 0.6 : 1.8
    const targetFill = isProjecting ? 0.15 : 0.45

    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, targetExposure, 4, delta)
    
    // Animate environment intensity if supported (R3F environment)
    if (scene.environmentIntensity !== undefined) {
      scene.environmentIntensity = THREE.MathUtils.damp(scene.environmentIntensity, targetEnvIntensity, 4, delta)
    }

    if (keyLightRef.current) keyLightRef.current.intensity = THREE.MathUtils.damp(keyLightRef.current.intensity, targetKey, 4, delta)
    if (rimLightRef.current) rimLightRef.current.intensity = THREE.MathUtils.damp(rimLightRef.current.intensity, targetRim, 4, delta)
    if (fillLightRef.current) fillLightRef.current.intensity = THREE.MathUtils.damp(fillLightRef.current.intensity, targetFill, 4, delta)
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
      <group>
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
