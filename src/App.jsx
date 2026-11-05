import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Stage from './scene/Stage'
import Overlay from './components/Overlay'
import LoadingScreen from './components/LoadingScreen'
import SkyBackground from './story/dom/SkyBackground'
import StoryHUD from './story/dom/StoryHUD'
import SunriseSkip from './story/dom/SunriseSkip'
import SongPrompt from './story/dom/SongPrompt'
import useStoryStore from './story/useStoryStore'
import { startFromAddress } from './story/navigate'
import useStoryRouting from './story/useStoryRouting'
import { bridgeDeviceToStory } from './story/bridge'
import useDeviceStore from './scene/useDeviceStore'
import * as THREE from 'three'

/**
 * Pick the stage theme for the current mode. Everywhere the page is the sky of
 * the hour; only the projector takes the room's lights down over it — as a
 * cartridge seats, then darker while it projects — so the preview and its beam
 * have something to read against. Browsing the carousel is the projects
 * chapter's midday, and stays in its light.
 */
function stageClass(mode) {
  if (mode === 'PROJECTING') return 'stage stage--dim stage--dark'
  if (mode === 'INSERTING') return 'stage stage--dim'
  return 'stage'
}

function App() {
  const mode = useDeviceStore((s) => s.mode)
  const started = useStoryStore((s) => s.started)

  // The device's modes become the story's chapters, and each chapter a page.
  useEffect(() => bridgeDeviceToStory(), [])
  // A chapter's address loaded cold goes straight into it, past the sunrise —
  // before the routing below, which would otherwise read the cold load as the
  // day not yet begun and put the address back to '/'.
  useEffect(() => { startFromAddress(window.location.pathname) }, [])
  useStoryRouting()

  return (
    <div className={`${stageClass(mode)} w-full h-screen relative`}>
      {/* Behind the canvas, which is transparent: the page is the sky. */}
      <SkyBackground />
      {/* The name (the way home), the clock and the chapter's caption. */}
      <StoryHUD />
      {/*
        * Out of sight until the day begins, as the greeting lifts: the device
        * assembles in the first light rather than sitting half-built under the
        * greeting. It still renders underneath, which is what the greeting
        * waits on.
        */}
      <Canvas
        className={`transition-opacity duration-[1600ms] ease-out ${started ? 'opacity-100' : 'opacity-0'}`}
        /* Plain PCF, softened by the sun's shadow.radius (SkyDriver.jsx). R3F's
           default, `true`, asks for PCFSoftShadowMap, which three has deprecated
           and was quietly replacing with this anyway — with a console warning. */
        shadows="percentage"
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
      <SongPrompt />
      <SunriseSkip />
      <LoadingScreen />
    </div>
  )
}

export default App
