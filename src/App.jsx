import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import DeviceModel from './components/DeviceModel'
import * as THREE from 'three'

function App() {
  return (
    <div className="w-full h-screen bg-transparent relative">
      <div className="absolute top-8 left-10 z-50 pointer-events-none">
        <h1 className="text-gray-900 text-xs font-bold tracking-[0.0em] lowercase opacity-80">
          alen koikkara
        </h1>
      </div>
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0.22, 0.42, 0.22], fov: 40, near: 0.005, far: 10 }}
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
