import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useGLTF, OrbitControls, Html, useAnimations } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, LoopOnce } from 'three'
import deviceGlb from '../assets/glb/device.glb'
import LightingSetup from '../components/LightingSetup'
import useDeviceStore from './useDeviceStore'
import * as THREE from 'three'
import { playMechanicalClick } from './audio'

/* ─── Camera constants ─── */
const CAM_TARGET = [0, 0.008, 0]
const CAM_REST_POS = [0.22, 0.42, 0.22]
/*
 * Open pose: the camera glides almost straight above the device so it reads
 * flat and screen-aligned, with the look target shifted towards the back edge
 * (the slot side) so the cartridge strip sits at the centre of the frame and
 * the device slides down beneath it. The camera stays a little in front of the
 * target so the lookAt up-vector keeps the back edge at the top of the screen.
 */
const CAM_OPEN_POS = [0, 0.7, -0.08]
const CAM_OPEN_TARGET = [0, 0.008, -0.1]
/*
 * Once a cartridge is in, the framing slides further up the desk so the device
 * drops towards the bottom of the frame and the projected preview gets the
 * room it needs. The lens and the protruding cartridge stay in shot, since
 * they are where the beam comes from.
 */
const CAM_PROJECT_POS = [0, 0.7, -0.12]
const CAM_PROJECT_TARGET = [0, 0.008, -0.14]
/** Modes framed for the projector rather than the carousel. */
const PROJECT_MODES = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])
const CAM_EASE = 5
/*
 * The open camera looks almost straight down, where lookAt's default up vector
 * is nearly parallel to the view direction and the resulting roll is unstable:
 * the view can come back from a close rolled 180 degrees. So the up vector is
 * steered explicitly. Looking down, screen-up is world -Z, which is also the
 * edge of the device the slot and lens sit on.
 */
const UP_IDLE = new THREE.Vector3(0, 1, 0)
const UP_OPEN = new THREE.Vector3(0, 0, -1)
const CAM_PATH = [
  { t: 0.00, pos: [0.38, 0.10, 0.42] },
  { t: 2.60, pos: [0.34, 0.18, 0.37] },
  { t: 4.33, pos: [0.30, 0.26, 0.32] },
  { t: 6.83, pos: [0.26, 0.34, 0.27] },
  { t: 9.17, pos: [0.22, 0.42, 0.22] },
]
const CAM_HFOV = 36.24

function smoothstep(t) { return t * t * (3 - 2 * t) }

const _a = new THREE.Vector3(), _b = new THREE.Vector3()
function sampleCamPath(time, out) {
  const p = CAM_PATH
  const maxT = p[p.length - 1].t
  const globalProgress = Math.max(0, Math.min(1, time / maxT))
  const easedTime = smoothstep(globalProgress) * maxT

  if (easedTime <= p[0].t) return out.fromArray(p[0].pos)
  if (easedTime >= maxT) return out.fromArray(p[p.length - 1].pos)

  for (let i = 0; i < p.length - 1; i++) {
    const k0 = p[i], k1 = p[i + 1]
    if (easedTime <= k1.t) {
      const u = (easedTime - k0.t) / (k1.t - k0.t)
      _a.fromArray(k0.pos); _b.fromArray(k1.pos)
      return out.copy(_a).lerp(_b, u)
    }
  }
  return out.fromArray(p[p.length - 1].pos)
}

/* ─── Button component ─── */
function DeviceButton({ position, description, labelDirection = 'down', children, onClick, name, introDone, isExploded = false }) {
  const buttonRef = useRef()
  const [clicked, setClicked] = useState(false)
  const [hovered, setHovered] = useState(false)
  // Mirror the --stage-ink values from index.css based on mode
  const mode = useDeviceStore((s) => s.mode)
  const labelColor = mode === 'IDLE' ? '#111827' : '#f3f4f6'

  const baseY = position[1]
  const pressedY = baseY - 0.005
  const randomExplodeOffset = useMemo(() => 0.035 + Math.random() * 0.03, [])
  const explodeTargetY = baseY + randomExplodeOffset

  const handleClick = (e) => {
    if (!introDone) return
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
    if (buttonRef.current && introDone) {
      const targetY = isExploded ? explodeTargetY : (clicked ? pressedY : baseY)
      buttonRef.current.position.y = MathUtils.lerp(
        buttonRef.current.position.y,
        targetY,
        0.1
      )
    }
  })

  // SVG path label directions
  let pathD = ''
  let textPosition = {}

  if (labelDirection === 'up') {
    pathD = 'M 0 0 L 0 -200 L 50 -250 L 300 -250'
    textPosition = { left: '310px', bottom: '250px', transform: 'translateY(50%)' }
  } else if (labelDirection === 'down') {
    pathD = 'M 0 0 L 0 200 L -50 250 L -300 250'
    textPosition = { right: '310px', top: '250px', transform: 'translateY(-50%)' }
  } else if (labelDirection === 'left') {
    pathD = 'M 0 0 L -200 0 L -250 -50 L -400 -50'
    textPosition = { right: '410px', bottom: '50px', transform: 'translateY(50%)' }
  } else if (labelDirection === 'right') {
    pathD = 'M 0 0 L 200 0 L 250 50 L 400 50'
    textPosition = { left: '410px', top: '50px', transform: 'translateY(-50%)' }
  }

  const pathLength = 550

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
            <svg className="absolute overflow-visible top-0 left-0">
              <path
                d={pathD}
                fill="none"
                stroke={labelColor}
                strokeWidth="1.5"
                strokeDasharray={pathLength}
                strokeDashoffset={hovered ? 0 : pathLength}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.83, 0, 0.17, 1), stroke 700ms cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div
              className="absolute whitespace-nowrap text-xs font-medium tracking-widest lowercase pb-1 transition-opacity duration-700"
              style={{
                ...textPosition,
                color: labelColor,
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

/* ─── Main Device ─── */
export default function Device({ slotAnchorRef }) {
  const group = useRef()
  const bodyRef = useRef()
  const screenRef = useRef()
  const introElapsedRef = useRef(0)
  const ejectButtonRef = useRef()
  const controlsRef = useRef()
  // Where the camera is looking; eased between the rest and open targets.
  const camTargetRef = useRef(new THREE.Vector3(...CAM_TARGET))
  const camUpRef = useRef(new THREE.Vector3(0, 1, 0))
  const camScratch = useMemo(() => ({
    restPos: new THREE.Vector3(...CAM_REST_POS),
    restTarget: new THREE.Vector3(...CAM_TARGET),
    openPos: new THREE.Vector3(...CAM_OPEN_POS),
    openTarget: new THREE.Vector3(...CAM_OPEN_TARGET),
    projectPos: new THREE.Vector3(...CAM_PROJECT_POS),
    projectTarget: new THREE.Vector3(...CAM_PROJECT_TARGET),
  }), [])

  const [isExploded, setIsExploded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [introDone, setIntroDone] = useState(false)

  // Zustand store
  const mode = useDeviceStore((s) => s.mode)
  const openCarousel = useDeviceStore((s) => s.openCarousel)
  const closeCarousel = useDeviceStore((s) => s.closeCarousel)
  const eject = useDeviceStore((s) => s.eject)

  // Keep Blender's horizontal FOV regardless of window shape
  const { size, camera } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    const hfov = THREE.MathUtils.degToRad(CAM_HFOV)
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / Math.max(aspect, 0.0001))
    camera.fov = THREE.MathUtils.radToDeg(vfov)
    camera.updateProjectionMatrix()
  }, [size.width, size.height, camera])

  const { nodes, materials, animations } = useGLTF(deviceGlb)
  const { actions, names, mixer } = useAnimations(animations, group)

  // Play all intro clips
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

  // Projects key toggle handler
  const handleProjectsKey = useCallback(() => {
    if (mode === 'IDLE') {
      openCarousel()
    } else if (mode === 'BROWSING') {
      closeCarousel()
    }
  }, [mode, openCarousel, closeCarousel])

  // Eject button handler
  const handleEject = useCallback((e) => {
    e.stopPropagation()
    playMechanicalClick()
    eject()
  }, [eject])

  // Eject button hover
  const handleEjectPointerOver = useCallback((e) => {
    if (!introDone || mode !== 'PROJECTING') return
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }, [introDone, mode])

  const handleEjectPointerOut = useCallback((e) => {
    e.stopPropagation()
    document.body.style.cursor = 'auto'
  }, [])

  // Camera cinematic + screen flicker + elastic snap-back + explode view
  useFrame((state, delta) => {
    // 1. Camera cinematic intro
    if (!introDone) {
      introElapsedRef.current += delta
      sampleCamPath(introElapsedRef.current, state.camera.position)
      state.camera.lookAt(...CAM_TARGET)
    }

    // 2. Screen glow flicker
    if (materials.ScreenText) {
      const t = state.clock.elapsedTime
      let glow = 0

      if (t > 0.5 && t < 0.6) glow = 0.4
      else if (t > 0.7 && t < 0.8) glow = 0.7
      else if (t > 0.9 && t < 0.95) glow = 0.2
      else if (t > 1.1) glow = Math.min(1.0, (t - 1.1) * 2)

      materials.ScreenText.emissiveIntensity = glow
      materials.ScreenText.emissive.setHex(0xffffff)
    }

    // Keep the orbit pivot on the eased look target so re-enabling the
    // controls after a close does not snap the view.
    if (controlsRef.current) controlsRef.current.target.copy(camTargetRef.current)

    // Steer the up vector alongside the camera so neither pose relies on
    // lookAt guessing a roll. It converges on world up before the orbit
    // controls take over in IDLE.
    if (introDone) {
      const upK = 1 - Math.exp(-delta * CAM_EASE)
      camUpRef.current.lerp(mode === 'IDLE' ? UP_IDLE : UP_OPEN, upK).normalize()
      state.camera.up.copy(camUpRef.current)
    }

    // 3a. Open pose: glide to the flat, screen-aligned top-down view
    if (introDone && mode !== 'IDLE') {
      const framed = PROJECT_MODES.has(mode)
      const k = 1 - Math.exp(-delta * CAM_EASE)
      camTargetRef.current.lerp(framed ? camScratch.projectTarget : camScratch.openTarget, k)
      state.camera.position.lerp(framed ? camScratch.projectPos : camScratch.openPos, k)
      state.camera.lookAt(camTargetRef.current)
    }

    // 3b. Elastic camera snap-back (only in IDLE)
    //
    // Straight position ease, not a spherical one. Orbiting the azimuth is
    // degenerate directly overhead, which is exactly where the camera sits
    // when the carousel closes: a hair of movement in the look target flips
    // the azimuth by half a turn, sending the camera around the far side and
    // landing it rolled over. Easing the position needs no angles at all.
    if (introDone && !isDragging && mode === 'IDLE') {
      const k = 1 - Math.exp(-delta * CAM_EASE)
      camTargetRef.current.lerp(camScratch.restTarget, k)
      state.camera.position.lerp(camScratch.restPos, k)
      state.camera.lookAt(camTargetRef.current)
    }

    // 4. Exploded view animation (body & screen)
    if (bodyRef.current && screenRef.current) {
      const targetBodyY = isExploded ? -0.015 : 0.007
      const targetScreenY = isExploded ? 0.025 : 0.011

      bodyRef.current.position.y = MathUtils.lerp(bodyRef.current.position.y, targetBodyY, 0.1)
      screenRef.current.position.y = MathUtils.lerp(screenRef.current.position.y, targetScreenY, 0.1)
    }
  })

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        target={CAM_TARGET}
        enabled={introDone && mode === 'IDLE'}
        onStart={() => setIsDragging(true)}
        onEnd={() => setIsDragging(false)}
      />

      <LightingSetup />

      {/* The device never leaves the desk; the camera reframes it instead */}
      <group>
        {/* Animation root — useAnimations targets by name within this ref */}
        <group ref={group} dispose={null}>
          <group name="Scene">

            {/* Empties — SlotAnchor exposed via ref for insertion path */}
            <group name="LensAnchor" position={[-0.032, 0.007, -0.054]} />
            <group ref={slotAnchorRef} name="SlotAnchor" position={[0, 0.003, -0.049]} />

            {/* Device body */}
            <group ref={bodyRef} position={[0, 0.007, 0]} name="Body">
              <mesh castShadow receiveShadow geometry={nodes.Cube.geometry} material={materials.BodyPlastic} />
              <mesh castShadow receiveShadow geometry={nodes.Cube_1.geometry} material={materials.Well} />
              <mesh castShadow receiveShadow geometry={nodes.Cube_2.geometry} material={materials.SlotInterior} />
            </group>

            {/* Screen / display */}
            <group ref={screenRef} position={[-0.033, 0.011, -0.036]} name="Body_Details">
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

            {/* Eject button */}
            <mesh
              ref={ejectButtonRef}
              castShadow receiveShadow
              name="EjectButton"
              geometry={nodes.EjectButton.geometry}
              material={materials.EjectButton}
              position={[0.032, 0.007, -0.049]}
              onClick={handleEject}
              onPointerOver={handleEjectPointerOver}
              onPointerOut={handleEjectPointerOut}
            />

            {/* Projector lens */}
            <group name="ProjectorLens" position={[-0.032, 0.007, -0.049]}>
              <mesh castShadow receiveShadow geometry={nodes.ProjectorLens_1.geometry} material={materials.LensBarrel} />
              <mesh castShadow receiveShadow geometry={nodes.ProjectorLens_2.geometry} material={materials.LensGlass} />
              <mesh castShadow receiveShadow geometry={nodes.ProjectorLens_3.geometry} material={materials.LensElement2} />
              <mesh castShadow receiveShadow geometry={nodes.ProjectorLens_4.geometry} material={materials.LensElement3} />
            </group>

            {/* Top Logo Buttons */}
            <DeviceButton name="Btn_GH" introDone={introDone} isExploded={isExploded} position={[0.011, 0.007, -0.036]} description="GitHub Profile" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_1.geometry} material={materials.GitHubDark} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_LI" introDone={introDone} isExploded={isExploded} position={[-0.011, 0.007, -0.036]} description="LinkedIn" labelDirection="left">
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_1.geometry} material={materials.LinkedInBlue} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_MD" introDone={introDone} isExploded={isExploded} position={[0.033, 0.007, -0.036]} description="Medium Articles" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_1.geometry} material={materials.MediumBlack} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>

            {/* Bottom Keys */}
            <DeviceButton name="Key_Bot_0" introDone={introDone} isExploded={isExploded} onClick={() => setIsExploded(!isExploded)} position={[-0.033, 0.007, 0.022]} description="Explode" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_1" introDone={introDone} isExploded={isExploded} position={[-0.011, 0.007, 0.022]} description="Writing" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_2" introDone={introDone} isExploded={isExploded} position={[0.011, 0.007, 0.022]} description="Lab" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_3" introDone={introDone} isExploded={isExploded} position={[0.033, 0.007, 0.022]} description="Contact Me" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_1.geometry} material={materials.ContactAmber} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_2.geometry} material={materials.Dark} />
            </DeviceButton>

            {/* Top Keys — Key_Top_0 is the "Projects" trigger */}
            <DeviceButton name="Key_Top_0" introDone={introDone} isExploded={isExploded} onClick={handleProjectsKey} position={[-0.03, 0.007, -0.015]} description="Projects" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_1" introDone={introDone} isExploded={isExploded} position={[0, 0.007, -0.015]} description="About me" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_2" introDone={introDone} isExploded={isExploded} position={[0.03, 0.007, -0.015]} description="Photography" labelDirection="up">
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
