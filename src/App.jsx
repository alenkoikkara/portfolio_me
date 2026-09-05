import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import DeviceModel from './components/DeviceModel'
import * as THREE from 'three'

function App() {
  return (
    <div className="w-full h-screen bg-transparent">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0, 4.8, 1.6], fov: 40, near: 0.01, far: 200 }}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping, 
          outputColorSpace: THREE.SRGBColorSpace 
        }}
      >
        <Suspense fallback={null}>
          <DeviceModel />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
