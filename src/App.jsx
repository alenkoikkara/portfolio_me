import { Canvas } from '@react-three/fiber'
import Stage from './scene/Stage'
import Overlay from './components/Overlay'
import useDeviceStore, { ABOUT_MODES, GALLERY_MODES } from './scene/useDeviceStore'
import * as THREE from 'three'

/**
 * Pick the stage theme for the current mode. Pressing the projects key takes
 * the room lights down, and the projector takes them down further, so the
 * preview and its beam have something to read against.
 */
function stageClass(mode) {
  // The about view keeps the light page: its glass frosts the device away
  // against that same colour, not a change of room. The photography wall is
  // hung on the home page's own colour too — its backdrop plane is that colour
  // (BACKDROP in Gallery.jsx), so the page behind it matches on any overscroll.
  if (mode === 'IDLE' || ABOUT_MODES.has(mode) || GALLERY_MODES.has(mode)) return 'stage'
  if (mode === 'PROJECTING') return 'stage stage--dim stage--dark'
  return 'stage stage--dim'
}

function App() {
  const mode = useDeviceStore((s) => s.mode)
  const goHome = useDeviceStore((s) => s.goHome)

  return (
    <div className={`${stageClass(mode)} w-full h-screen relative`}>
      {/*
        * The wrapper stays click-through so it cannot swallow drags on the
        * canvas behind it; only the words themselves take the pointer.
        */}
      <div className="absolute top-8 left-10 z-50 pointer-events-none">
        <h1 className="stage-title text-xs font-bold tracking-[0.0em] lowercase opacity-80">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to the start"
            className="pointer-events-auto cursor-pointer lowercase tracking-[inherit] transition-opacity duration-200 hover:opacity-60"
          >
            alen koikkara
          </button>
        </h1>
      </div>
      <Canvas
        shadows
        dpr={[1, 2]}
        /* The rest pose from Device.jsx, so the very first frame — before the
           intro takes the camera over — is already framed where it will land. */
        camera={{ position: [0.253, 0.4818, 0.253], fov: 40, near: 0.001, far: 10 }}
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
