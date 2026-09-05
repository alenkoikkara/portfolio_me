import React, { useRef, useState, useEffect } from 'react'
import { useGLTF, Environment, OrbitControls, Html, useAnimations } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, LoopOnce } from 'three'
import deviceGlb from '../assets/glb/device.glb'
import LightingSetup from './LightingSetup'
import * as THREE from 'three'

const CAM_TARGET = [0, 0.008, 0]
const CAM_PATH = [
  { t: 0.00, pos: [0.38, 0.10, 0.42] }, // Start low and wide
  { t: 2.60, pos: [0.34, 0.18, 0.37] }, // Lifts up
  { t: 4.33, pos: [0.30, 0.26, 0.32] }, // Sweeps inward
  { t: 6.83, pos: [0.26, 0.34, 0.27] }, // Continues climbing
  { t: 9.17, pos: [0.22, 0.42, 0.22] }, // Final isometric shot
]
const CAM_HFOV = 36.24

function smoothstep(t) { return t * t * (3 - 2 * t); }

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function sampleCamPath(time, out) {
  const p = CAM_PATH;
  const maxT = p[p.length - 1].t;
  
  // Apply ease-in-out to the entire 9-second duration, not individual segments
  const globalProgress = Math.max(0, Math.min(1, time / maxT));
  const easedTime = smoothstep(globalProgress) * maxT;

  if (easedTime <= p[0].t) return out.fromArray(p[0].pos);
  if (easedTime >= maxT) return out.fromArray(p[p.length - 1].pos);
  
  for (let i = 0; i < p.length - 1; i++) {
    const k0 = p[i], k1 = p[i + 1];
    if (easedTime <= k1.t) {
      const u = (easedTime - k0.t) / (k1.t - k0.t); // Linear within segment to maintain velocity
      _a.fromArray(k0.pos); _b.fromArray(k1.pos);
      return out.copy(_a).lerp(_b, u);
    }
  }
  return out.fromArray(p[p.length - 1].pos);
}

// Procedural Mechanical Keyboard Sound (Tactile + Thock)
let audioCtx = null;
function playMechanicalClick() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const time = audioCtx.currentTime;
  
  // 1. The High-Frequency Tactile Snap
  const clickOsc = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  clickOsc.type = 'square';
  // Randomize pitch slightly for organic variation
  const clickPitch = 2500 + (Math.random() * 800 - 400);
  clickOsc.frequency.setValueAtTime(clickPitch, time);
  clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);
  
  clickGain.gain.setValueAtTime(0.08, time); // Subtle sharp click
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  
  clickOsc.connect(clickGain);
  clickGain.connect(audioCtx.destination);
  
  clickOsc.start(time);
  clickOsc.stop(time + 0.02);

  // 2. The Deep Bottom-Out "Thock"
  const thockOsc = audioCtx.createOscillator();
  const thockGain = audioCtx.createGain();
  thockOsc.type = 'sine';
  // Deep resonance
  const thockPitch = 300 + (Math.random() * 40 - 20);
  thockOsc.frequency.setValueAtTime(thockPitch, time + 0.01);
  thockOsc.frequency.exponentialRampToValueAtTime(50, time + 0.06);
  
  thockGain.gain.setValueAtTime(0, time);
  thockGain.gain.setValueAtTime(0.5, time + 0.01); // Louder, deeper thud
  thockGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  
  thockOsc.connect(thockGain);
  thockGain.connect(audioCtx.destination);
  
  thockOsc.start(time + 0.01);
  thockOsc.stop(time + 0.08);
}

// Reusable component to handle individual button state and animation
function DeviceButton({ position, description, labelDirection = 'down', children, onClick, name, introDone }) {
  const buttonRef = useRef()
  const [clicked, setClicked] = useState(false)
  const [hovered, setHovered] = useState(false)
  
  // Base Y is the Y value from the position prop
  const baseY = position[1]
  const pressedY = baseY - 0.005

  const handleClick = (e) => {
    if (!introDone) return // Prevent clicks during intro
    e.stopPropagation()
    setClicked(true)
    playMechanicalClick()
    setTimeout(() => setClicked(false), 150)
    if (onClick) onClick(e)
  }

  const handlePointerOver = (e) => {
    if (!introDone) return
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  useFrame(() => {
    // Only apply manual lerping if the intro animation has finished
    if (buttonRef.current && introDone) {
      const targetY = clicked ? pressedY : baseY
      buttonRef.current.position.y = MathUtils.lerp(
        buttonRef.current.position.y,
        targetY,
        0.3 // Snap speed
      )
    }
  })

  // SVG Path and Text Positioning for Sci-Fi HUD style labels
  let pathD = ""
  let textPosition = {}

  // The paths use a straight segment, a 45-degree bend, and a horizontal finish.
  if (labelDirection === 'up') {
    pathD = "M 0 0 L 0 -200 L 50 -250 L 300 -250"
    // Terminal is 300, -250. Text goes right from 310, vertically centered at -250.
    textPosition = { left: '310px', bottom: '250px', transform: 'translateY(50%)' }
  } else if (labelDirection === 'down') {
    pathD = "M 0 0 L 0 200 L -50 250 L -300 250"
    // Terminal is -300, 250. Text goes left from -310, vertically centered at 250.
    textPosition = { right: '310px', top: '250px', transform: 'translateY(-50%)' }
  } else if (labelDirection === 'left') {
    pathD = "M 0 0 L -200 0 L -250 -50 L -400 -50"
    // Terminal is -400, -50. Text goes left from -410, vertically centered at -50.
    textPosition = { right: '410px', bottom: '50px', transform: 'translateY(50%)' }
  } else if (labelDirection === 'right') {
    pathD = "M 0 0 L 200 0 L 250 50 L 400 50"
    // Terminal is 400, 50. Text goes right from 410, vertically centered at 50.
    textPosition = { left: '410px', top: '50px', transform: 'translateY(-50%)' }
  }

  const pathLength = 550 // Max length (520.7px) rounded up to ensure path is fully hidden when not hovered

  return (
    <group 
      ref={buttonRef}
      name={name}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children}
      {description && introDone && (
        <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
          <div className="w-0 h-0 relative pointer-events-none">
            
            {/* SVG Line that draws itself */}
            <svg className="absolute overflow-visible top-0 left-0">
              <path 
                d={pathD} 
                fill="none" 
                stroke="#111827" 
                strokeWidth="1.5"
                strokeDasharray={pathLength}
                strokeDashoffset={hovered ? 0 : pathLength}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.83, 0, 0.17, 1)' }}
              />
            </svg>

            {/* Plain text resting exactly on the horizontal segment of the line */}
            <div 
              className="absolute whitespace-nowrap text-xs font-medium tracking-widest lowercase text-gray-900 pb-1 transition-opacity duration-700"
              style={{
                ...textPosition,
                opacity: hovered ? 1 : 0,
                transitionDelay: hovered ? '800ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.83, 0, 0.17, 1)'
              }}
            >
              {description}
            </div>

          </div>
        </Html>
      )}
    </group>
  )
}

export default function DeviceModel() {
  const group = useRef()
  const introElapsedRef = useRef(0)
  
  // Keep Blender's horizontal FOV regardless of window shape
  const { size, camera } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height;
    const hfov = THREE.MathUtils.degToRad(CAM_HFOV);
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / Math.max(aspect, 0.0001));
    camera.fov = THREE.MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera])

  const [introDone, setIntroDone] = useState(false)
  const { nodes, materials, animations } = useGLTF(deviceGlb)
  const { actions, names, mixer } = useAnimations(animations, group)

  useEffect(() => {
    if (names && names.length > 0) {
      let finishedCount = 0
      
      names.forEach((name) => {
        const action = actions[name]
        action.setLoop(LoopOnce)
        action.clampWhenFinished = true
        action.play()
      })
      
      const onFinished = () => {
        finishedCount++
        // Wait for all clips (one per object) to finish
        if (finishedCount === names.length) {
          setIntroDone(true)
        }
      }
      
      mixer.addEventListener('finished', onFinished)
      return () => mixer.removeEventListener('finished', onFinished)
    } else {
      setIntroDone(true)
    }
  }, [actions, names, mixer])

  // Screen power-on animation & Cinematic Camera
  useFrame((state, delta) => {
    // 1. Camera Cinematic Move
    if (!introDone) {
      introElapsedRef.current += delta
      sampleCamPath(introElapsedRef.current, state.camera.position)
      state.camera.lookAt(...CAM_TARGET)
    }

    // 2. Screen Glow Flicker
    if (materials.ScreenText) {
      const t = state.clock.elapsedTime
      let glow = 0
      
      // Flicker on sequence
      if (t > 0.5 && t < 0.6) glow = 0.4
      else if (t > 0.7 && t < 0.8) glow = 0.7
      else if (t > 0.9 && t < 0.95) glow = 0.2
      else if (t > 1.1) glow = Math.min(1.0, (t - 1.1) * 2) // Smooth fade up to 1
      
      materials.ScreenText.emissiveIntensity = glow
      // Ensure the emissive color is white
      materials.ScreenText.emissive.setHex(0xffffff)
    }
  })

  return (
    <>
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        target={CAM_TARGET}
        enabled={introDone}
      />

      <LightingSetup />

      {/* Main Group wrapping the GLB mesh nodes */}
      <group ref={group} dispose={null}>
        
          <group name="Scene">
          <group name="HiChord">
            
            {/* Device Body & Screen */}
            <group position={[0, 0.007, 0]} name="Body">
              <mesh castShadow receiveShadow geometry={nodes.Cube.geometry} material={materials.BodyPlastic} />
              <mesh castShadow receiveShadow geometry={nodes.Cube_1.geometry} material={materials.Well} />
            </group>
            <group position={[-0.033, 0.011, -0.036]} name="Body_Details">
              <mesh castShadow receiveShadow geometry={nodes.Cube001.geometry} material={materials.DisplayFrame} />
              <mesh castShadow receiveShadow geometry={nodes.Cube001_1.geometry} material={materials.Display} />
              <mesh castShadow receiveShadow geometry={nodes.Cube001_2.geometry} material={materials.ScreenText} />
            </group>
            
            {/* Solid plug to hide internals during fly-in */}
            <mesh 
              castShadow receiveShadow
              name="Well_Fill" 
              geometry={nodes.Well_Fill.geometry} 
              material={materials.BodyPlastic} 
              position={[0, 0.011, 0]} 
              scale={[0.801, 1, 0.751]} 
              visible={!introDone} 
            />
            
            {/* Top Logo Buttons */}
            <DeviceButton name="Btn_GH" introDone={introDone} position={[0.011, 0.007, -0.036]} description="GitHub Profile" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_1.geometry} material={materials.GitHubDark} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_LI" introDone={introDone} position={[-0.011, 0.007, -0.036]} description="LinkedIn" labelDirection="left">
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_1.geometry} material={materials.LinkedInBlue} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_MD" introDone={introDone} position={[0.033, 0.007, -0.036]} description="Medium Articles" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_1.geometry} material={materials.MediumBlack} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>

            {/* Bottom Keys */}
            <DeviceButton name="Key_Bot_0" introDone={introDone} position={[-0.033, 0.007, 0.022]} description="Resume" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_1" introDone={introDone} position={[-0.011, 0.007, 0.022]} description="Writing" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_2" introDone={introDone} position={[0.011, 0.007, 0.022]} description="Lab" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_3" introDone={introDone} position={[0.033, 0.007, 0.022]} description="Contact Me" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_1.geometry} material={materials.ContactAmber} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_2.geometry} material={materials.Dark} />
            </DeviceButton>
            
            {/* Top Keys */}
            <DeviceButton name="Key_Top_0" introDone={introDone} position={[-0.03, 0.007, -0.015]} description="Projects" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_1" introDone={introDone} position={[0, 0.007, -0.015]} description="About me" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_2" introDone={introDone} position={[0.03, 0.007, -0.015]} description="Photography" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_2_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_2_2.geometry} material={materials.Dark} />
            </DeviceButton>
          </group>
        </group>
      </group>
    </>
  )
}

useGLTF.preload(deviceGlb)
