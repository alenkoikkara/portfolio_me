import { Canvas } from '@react-three/fiber'
import Stage from './scene/Stage'
import Overlay from './components/Overlay'
import useDeviceStore, { GALLERY_MODES } from './scene/useDeviceStore'
import * as THREE from 'three'

/**
 * Pick the stage theme for the current mode. Pressing the projects key takes
 * the room lights down, and the projector takes them down further, so the
 * preview and its beam have something to read against.
 */
function stageClass(mode) {
  if (mode === 'IDLE') return 'stage'
  if (mode === 'PROJECTING') return 'stage stage--dim stage--dark'
  // The gallery is a dark room hung with prints, so it goes all the way down —
  // the backdrop plane fills the frame, and the page behind it should match
  // rather than show a light edge on any overscroll.
  if (GALLERY_MODES.has(mode)) return 'stage stage--dim stage--dark'
  return 'stage stage--dim'
}

function App() {
  const mode = useDeviceStore((s) => s.mode)

  return (
    <div className={`${stageClass(mode)} w-full h-screen relative`}>
      <div className="absolute top-8 left-10 z-50 pointer-events-none">
        <h1 className="stage-title text-xs font-bold tracking-[0.0em] lowercase opacity-80">
          alen koikkara
        </h1>
      </div>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0.22, 0.42, 0.22], fov: 40, near: 0.001, far: 10 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        <Stage />
      </Canvas>
      <Overlay />
    </div>
  )
}

export default App
