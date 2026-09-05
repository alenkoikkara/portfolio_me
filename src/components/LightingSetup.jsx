import React, { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { useControls, Leva } from 'leva'
import * as THREE from 'three'

const DEFAULT_CONFIG = {
  exposure: 1.1,
  envIntensity: 1.5,
  
  keyPosition: [-6.0, 5.0, 6.0], // Left, Above, In front
  keyIntensity: 3.5,
  keyColor: '#ffffff',
  
  fillPosition: [4.0, 0.0, 3.0], // Right side fill
  fillIntensity: 1.2,
  fillColor: '#dfe6f0',
  
  shadowOpacity: 0.25,
}

export default function LightingSetup() {
  const { gl } = useThree()
  
  // Only mount Leva UI if ?debug is in URL
  const [showDebug, setShowDebug] = useState(false)
  useEffect(() => {
    if (window.location.search.includes('debug')) {
      setShowDebug(true)
    }
  }, [])

  // Create Leva controls
  const {
    exposure,
    envIntensity,
    keyPosition,
    keyIntensity,
    keyColor,
    fillPosition,
    fillIntensity,
    fillColor,
    shadowOpacity
  } = useControls('Lighting', {
    exposure: { value: DEFAULT_CONFIG.exposure, min: 0.1, max: 3, step: 0.1 },
    envIntensity: { value: DEFAULT_CONFIG.envIntensity, min: 0, max: 5, step: 0.1 },
    
    'Key Light': { folder: true, collapsed: false },
    keyPosition: { value: DEFAULT_CONFIG.keyPosition },
    keyIntensity: { value: DEFAULT_CONFIG.keyIntensity, min: 0, max: 10, step: 0.1 },
    keyColor: { value: DEFAULT_CONFIG.keyColor },
    
    'Fill Light': { folder: true, collapsed: false },
    fillPosition: { value: DEFAULT_CONFIG.fillPosition },
    fillIntensity: { value: DEFAULT_CONFIG.fillIntensity, min: 0, max: 5, step: 0.1 },
    fillColor: { value: DEFAULT_CONFIG.fillColor },
    
    'Shadows': { folder: true, collapsed: false },
    shadowOpacity: { value: DEFAULT_CONFIG.shadowOpacity, min: 0, max: 1, step: 0.05 }
  })

  // Apply tone mapping exposure
  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return (
    <>
      <Leva hidden={!showDebug} />

      {/* Image Based Lighting */}
      <Environment preset="city" environmentIntensity={envIntensity} />

      {/* Key Light */}
      <directionalLight
        position={keyPosition}
        intensity={keyIntensity}
        color={keyColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
        shadow-radius={4}
      />

      {/* Fill Light */}
      <directionalLight
        position={fillPosition}
        intensity={fillIntensity}
        color={fillColor}
      />
    </>
  )
}
