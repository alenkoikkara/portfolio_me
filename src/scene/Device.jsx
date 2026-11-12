import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useGLTF, OrbitControls, Html, useAnimations } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, LoopOnce } from 'three'
import deviceGlb from '../assets/glb/device.glb'
import LightingSetup from '../components/LightingSetup'
import useDeviceStore, { ABOUT_MODES, GALLERY_MODES } from './useDeviceStore'
import * as THREE from 'three'
import { playMechanicalClick, playNote } from './audio'
import { GRACE_NOTES, music } from '../story/chords'
import { SOCIAL_LINKS } from '../data/contact'
import { prefersReducedMotion, isTouch } from '../story/environment'
import useStoryStore from '../story/useStoryStore'
import deviceFade from './deviceFade'
import { INTRO_SECONDS, landingTime } from './intro'
import { skipSunrise } from '../story/navigate'
import { verticalFov, restPose, PHONE_WIDTH } from './cameraFov'

/* ─── Camera constants ─── */
const CAM_TARGET = [0, 0.008, 0]

/*
 * How much further back than first framed the camera rests, along the same
 * line to the device — the device is real-size and never scales, so a smaller
 * device on screen means a camera standing further off. 1.15 draws it at about
 * 87% of its original size. The intro fly-in is pulled back by the same factor
 * so it still lands exactly on the rest pose, instead of coming in too close and
 * drifting back out.
 */
const REST_PULLBACK = 1.15
const pulledBack = ([x, y, z]) => [
  CAM_TARGET[0] + (x - CAM_TARGET[0]) * REST_PULLBACK,
  CAM_TARGET[1] + (y - CAM_TARGET[1]) * REST_PULLBACK,
  CAM_TARGET[2] + (z - CAM_TARGET[2]) * REST_PULLBACK,
]
const CAM_REST_POS = pulledBack([0.22, 0.42, 0.22])
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

/*
 * The same two poses on a phone, much nearer: from 70 cm a cartridge was a
 * tenth of a phone's width and the projected page a postage stamp. Browsing
 * frames the one cartridge shown at about 60% of the width, with the device's
 * top edge below it; projecting fills the width with the preview, the device
 * under it. Still all but overhead, a hair in front of the target, for the
 * same reason as the desktop's.
 */
const PHONE_OPEN_POS = [0, 0.14, -0.096]
const PHONE_OPEN_TARGET = [0, 0.008, -0.1]
const PHONE_PROJECT_POS = [0, 0.45, -0.104]
const PHONE_PROJECT_TARGET = [0, 0.008, -0.11]

/** Modes framed for the projector rather than the carousel. */
const PROJECT_MODES = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])
const CAM_EASE = 5
/*
 * Longest frame the camera easing will act on, in seconds.
 *
 * The glide is exponential on frame delta, so one very long frame — a tab
 * returning to the foreground, a garbage collection — would resolve almost
 * the whole move in a single step and read as a jump rather than a glide.
 *
 * The cap is deliberately loose. Anything down to ten frames a second passes
 * through untouched, so normal playback is unaffected on any real display;
 * only a pathological frame is damped. A tighter cap would starve the easing
 * on a slow device and make the move take longer, which is the opposite of
 * what this is for.
 */
const MAX_EASE_STEP = 0.1

/*
 * How far a key rises when the pointer is over it, in metres.
 *
 * A third of the travel it drops when pressed, so the two read as the same
 * mechanism at different strengths: the key comes to meet you, then gives way
 * under the click.
 */
const HOVER_LIFT = 0.0016
/*
 * A key's annotation: shown 150 ms after the pointer arrives — long enough
 * that sweeping across the device does not flash every label — and drawn in
 * well under half a second. It was 800 ms and 1.5 s, which read as the site
 * being slow to answer.
 */
const LABEL_DELAY_MS = 150
const LABEL_DRAW_MS = 350
const LABEL_FADE_MS = 250
/** The Sound key's glow while sound is on: the one accent, amber. */
const SOUND_GLOW = '#e8b04a'
const SOUND_GLOW_STRENGTH = 0.35
/*
 * How long the device takes to fade out for the gallery, and to come back, in
 * seconds.
 *
 * Matched to the 700 ms stage dim in index.css, so the desk and the room it
 * sits in go down together instead of the device vanishing against a page that
 * is still bright.
 *
 * The wall hangs five metres behind the device, so the switch between them is a
 * cut between two cameras rather than a move. Taking the device down to nothing
 * first means that cut lands on an empty frame in both directions, and there is
 * never a frame showing the desk and the wall in the same breath. It is shorter
 * than the OPENING_GALLERY beat, so the device is gone before the camera
 * changes hands.
 *
 * A linear ramp rather than the exponential damp the camera uses. This fade
 * ends by putting every material's original blend mode back, so it has to
 * actually arrive: an asymptotic approach never satisfies its own end condition,
 * and a loop that stops early — a backgrounded tab throttling its frames — would
 * leave the device stranded a fraction short of opaque and permanently sorted as
 * transparent geometry. A ramp lands exactly, in a bounded number of frames.
 */
const DEVICE_FADE_SECONDS = 0.7

/*
 * The open camera looks almost straight down, where lookAt's default up vector
 * is nearly parallel to the view direction and the resulting roll is unstable:
 * the view can come back from a close rolled 180 degrees. So the up vector is
 * steered explicitly. Looking down, screen-up is world -Z, which is also the
 * edge of the device the slot and lens sit on.
 */
const UP_IDLE = new THREE.Vector3(0, 1, 0)
/** The idle sway: ±0.4° over nine seconds, around the vertical. */
const SWAY_RADIANS = THREE.MathUtils.degToRad(0.4)
const SWAY_PERIOD = 9
const SWAY_AXIS = new THREE.Vector3(0, 1, 0)
const UP_OPEN = new THREE.Vector3(0, 0, -1)
/*
 * The fly-in, its beats as shares of the intro: authored over nine seconds and
 * squeezed to INTRO_SECONDS with the same shape, so changing the length is one
 * number in intro.js.
 */
const CAM_PATH = [
  { t: 0, pos: pulledBack([0.38, 0.10, 0.42]) },
  { t: 0.284 * INTRO_SECONDS, pos: pulledBack([0.34, 0.18, 0.37]) },
  { t: 0.472 * INTRO_SECONDS, pos: pulledBack([0.30, 0.26, 0.32]) },
  { t: 0.745 * INTRO_SECONDS, pos: pulledBack([0.26, 0.34, 0.27]) },
  { t: INTRO_SECONDS, pos: CAM_REST_POS },
]

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

/*
 * A finger's hit area. On a touch screen or a phone each key carries an
 * invisible box a little larger than its cap — drawn, so the pointer's ray
 * finds it, but writing neither colour nor depth — which brings even the
 * small round keys past 44 CSS px with the device at 90% of a phone's width.
 */
const HIT_MARGIN = 0.0025
const HIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const HIT_MATERIAL = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
const wantsBigHits = () => isTouch() || (typeof window !== 'undefined' && window.innerWidth < PHONE_WIDTH)

/* ─── Button component ─── */
function DeviceButton({ position, description, labelDirection = 'down', children, onClick, onCollapse, name, introDone, landed, isExploded = false }) {
  const buttonRef = useRef()
  // A key takes the pointer the moment it has landed, not when the whole
  // device has: the opening is three seconds, and there is no reason to make a
  // visitor wait out the last key to press the first.
  const ready = introDone || landed.has(name)

  // The cap's own bounds, from its meshes' geometry, grown by the margin.
  const hitBox = useMemo(() => {
    if (!wantsBigHits()) return null
    const box = new THREE.Box3()
    React.Children.forEach(children, (child) => {
      const geometry = child?.props?.geometry
      if (!geometry) return
      if (!geometry.boundingBox) geometry.computeBoundingBox()
      box.union(geometry.boundingBox)
    })
    if (box.isEmpty()) return null
    box.expandByVector(new THREE.Vector3(HIT_MARGIN, 0.001, HIT_MARGIN))
    return { center: box.getCenter(new THREE.Vector3()).toArray(), size: box.getSize(new THREE.Vector3()).toArray() }
  }, [])
  const [clicked, setClicked] = useState(false)
  const [hovered, setHovered] = useState(false)

  /*
   * Pressed by the song rather than the visitor (`pressKey` in the store): the
   * key goes down and comes back up in time with its chord, and nothing opens.
   * The press seen at mount is skipped, so mounting never replays an old one.
   */
  const pressedKey = useDeviceStore((s) => s.pressedKey)
  const seenPress = useRef(pressedKey?.at)
  useEffect(() => {
    if (!pressedKey || pressedKey.at === seenPress.current) return
    seenPress.current = pressedKey.at
    if (pressedKey.name !== name) return
    setClicked(true)
    const timer = setTimeout(() => setClicked(false), 220)
    return () => clearTimeout(timer)
  }, [pressedKey, name])
  /*
   * Whether the annotation was dismissed by a click rather than by the pointer
   * leaving. It is taken away without animating in that case: retracting it
   * draws the leader line back, which sends a hairline sweeping four hundred
   * pixels across the screen just as the visitor clicks something — read as a
   * glitch, and the largest thing moving in the frame at that moment. Leaving normally still retracts, which is where that animation
   * belongs, since the pointer is on its way out anyway.
   */
  const [dismissed, setDismissed] = useState(false)
  /*
   * The page's own ink, read straight from the CSS variable: it follows the
   * sky (dark by day, light by night) and the room going down, with no copy of
   * either rule kept here. The label is DOM, under the stage, so it inherits.
   */
  const labelColor = 'var(--stage-ink)'

  const baseY = position[1]
  const pressedY = baseY - 0.005
  const randomExplodeOffset = useMemo(() => 0.035 + Math.random() * 0.03, [])
  const explodeTargetY = baseY + randomExplodeOffset

  const handleClick = (e) => {
    // Still coming up: the intro jumps to its end and the key acts at once — a
    // click during the opening is never ignored.
    if (!ready) skipSunrise()
    // Pressed while the device is exploded: it comes back together, and the
    // key does what it does — rather than acting on a device in pieces.
    if (isExploded) onCollapse?.()
    e.stopPropagation()
    setClicked(true)
    playMechanicalClick()
    // The small keys each ring a note of D major pentatonic, under the click.
    if (music.on && GRACE_NOTES[name]) playNote(GRACE_NOTES[name])
    setTimeout(() => setClicked(false), 150)
    // Retract the leader line and its label: the button has been read and
    // acted on, so the annotation has done its job. The pointer is still over
    // the key, so no pointerout follows and it would otherwise stay drawn.
    // Leaving and hovering again draws it back.
    setHovered(false)
    setDismissed(true)
    if (onClick) onClick(e)
  }

  const handlePointerOver = (e) => {
    if (!ready) return
    e.stopPropagation()
    setHovered(true)
    setDismissed(false)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    setHovered(false)
    setDismissed(false)
    document.body.style.cursor = 'auto'
  }

  useFrame(() => {
    if (buttonRef.current && ready) {
      // Exploded overrides everything; a press beats a hover, so the key
      // still dips even though the pointer is by definition on it.
      let targetY = baseY
      if (isExploded) targetY = explodeTargetY
      else if (clicked) targetY = pressedY
      else if (hovered) targetY = baseY + HOVER_LIFT
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
      {hitBox && <mesh position={hitBox.center} scale={hitBox.size} geometry={HIT_BOX} material={HIT_MATERIAL} />}
      {description && ready && (
        <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
          <div className="w-0 h-0 relative pointer-events-none">
            <svg className="absolute overflow-visible top-0 left-0">
              <path
                d={pathD}
                fill="none"
                strokeWidth="1.5"
                strokeDasharray={pathLength}
                strokeDashoffset={hovered ? 0 : pathLength}
                style={{
                  // As a style, not an attribute: SVG presentation attributes take no CSS variables.
                  stroke: labelColor,
                  transition: dismissed
                    ? 'stroke 700ms cubic-bezier(0.4, 0, 0.2, 1)'
                    : `stroke-dashoffset ${LABEL_DRAW_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${hovered ? LABEL_DELAY_MS : 0}ms, stroke 700ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              />
            </svg>
            <div
              className="absolute whitespace-nowrap text-xs font-medium tracking-widest lowercase pb-1"
              style={{
                ...textPosition,
                color: labelColor,
                opacity: hovered ? 1 : 0,
                // The words come up with the line, read in under half a second.
                // One shorthand: mixing it with transitionDelay confuses React's restyle.
                transition: dismissed
                  ? 'none'
                  : `opacity ${LABEL_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${hovered ? LABEL_DELAY_MS : 0}ms`
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
    // Scratch for the snap-back, so it allocates nothing per frame.
    offset: new THREE.Vector3(),
    restOffset: new THREE.Vector3(),
  }), [])

  // Every material under the device root, with the `transparent` flag it was
  // authored with, so the fade can put it back rather than leaving the whole
  // device permanently sorted as transparent geometry.
  const fadeMaterials = useRef(null)

  const [isExploded, setIsExploded] = useState(false)
  const collapse = useCallback(() => setIsExploded(false), [])
  /*
   * A ref, not state: it is only ever read inside the frame loop, and drei's
   * OrbitControls fires start and end on every click — even one that never
   * moves. As state that was two React renders per click, which re-rendered
   * LightingSetup, which re-rendered drei's <Environment>, which re-applies
   * `scene.environmentIntensity` from its prop. The scene's ambient light was
   * being knocked down and eased back on every click of the canvas.
   */
  const isDraggingRef = useRef(false)
  const [introDone, setIntroDone] = useState(false)
  // The keys whose clips have landed, while the intro plays (see DeviceButton).
  const [landed, setLanded] = useState(() => new Set())
  // Dev only: which keys take clicks yet, for timing the opening from a harness.
  useEffect(() => {
    if (import.meta.env.DEV) window.__landed = { keys: [...landed], at: performance.now() }
  }, [landed])
  const markIntroDone = useDeviceStore((s) => s.markIntroDone)
  const markSceneReady = useDeviceStore((s) => s.markSceneReady)
  const curtainUp = useDeviceStore((s) => s.curtainUp)
  const introSkipped = useDeviceStore((s) => s.introSkipped)
  const framesRun = useRef(0)

  // Zustand store
  const mode = useDeviceStore((s) => s.mode)
  const openCarousel = useDeviceStore((s) => s.openCarousel)
  const closeCarousel = useDeviceStore((s) => s.closeCarousel)
  const eject = useDeviceStore((s) => s.eject)
  const openGallery = useDeviceStore((s) => s.openGallery)
  const galleryOpened = useDeviceStore((s) => s.galleryOpened)
  const openAbout = useDeviceStore((s) => s.openAbout)
  const openContact = useDeviceStore((s) => s.openContact)
  const openWriting = useDeviceStore((s) => s.openWriting)
  const inAbout = ABOUT_MODES.has(mode)
  // The modes that keep the device at rest: home itself, and the sections laid
  // over it — the about view's glass and the contact and writing panels.
  const atRest = mode === 'IDLE' || inAbout || mode === 'CONTACT' || mode === 'WRITING'
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  /*
   * While the wall is up it owns the default camera, and every camera line
   * below writes to `state.camera` — that is, to whichever camera is default.
   * Without this guard the device would keep dragging the gallery camera back
   * towards the device, five metres in front of the wall.
   */
  const inGallery = GALLERY_MODES.has(mode)

  // The same device size on any desktop-shaped window; see cameraFov.js.
  const { size, camera } = useThree()
  useEffect(() => {
    // `camera` is whichever camera is currently default, and in the gallery
    // that is the wall's own — which wants its own field of view, not the one
    // framing a 92 mm device.
    if (inGallery) return
    camera.fov = verticalFov(size.width / Math.max(size.height, 1))
    camera.updateProjectionMatrix()
  }, [size.width, size.height, camera, inGallery])

  /*
   * The rest pose for this window (cameraFov.js): nearer on a phone, and
   * steeper. Held as one turn and one scale about the look target, applied to
   * the rest pose and to every point of the intro's fly-in alike, so the
   * intro still lands exactly on rest.
   */
  const { scale: restScale, tilt: restTilt } = restPose(size.width, size.height)
  const restTurn = useMemo(() => {
    const from = new THREE.Vector3(...CAM_REST_POS).sub(camScratch.restTarget).normalize()
    if (restTilt === null) return new THREE.Quaternion()
    const elevation = THREE.MathUtils.degToRad(90 - restTilt)
    const to = new THREE.Vector3(from.x, 0, from.z).normalize().multiplyScalar(Math.cos(elevation)).setY(Math.sin(elevation))
    return new THREE.Quaternion().setFromUnitVectors(from, to)
  }, [restTilt, camScratch])
  const phone = size.width < PHONE_WIDTH
  useEffect(() => {
    camScratch.openPos.set(...(phone ? PHONE_OPEN_POS : CAM_OPEN_POS))
    camScratch.openTarget.set(...(phone ? PHONE_OPEN_TARGET : CAM_OPEN_TARGET))
    camScratch.projectPos.set(...(phone ? PHONE_PROJECT_POS : CAM_PROJECT_POS))
    camScratch.projectTarget.set(...(phone ? PHONE_PROJECT_TARGET : CAM_PROJECT_TARGET))
  }, [phone, camScratch])
  useEffect(() => {
    camScratch.restPos.set(...CAM_REST_POS).sub(camScratch.restTarget).applyQuaternion(restTurn).multiplyScalar(restScale).add(camScratch.restTarget)
  }, [restScale, restTurn, camScratch])

  const { nodes, materials, animations } = useGLTF(deviceGlb)
  const { actions, names, mixer } = useAnimations(animations, group)

  /*
   * When each part's clip lands, in clip seconds, and when the last does. The
   * clips are authored long — ten seconds, the last key down at about eight —
   * and are played faster so that the last key lands exactly as the camera's
   * fly-in ends, INTRO_SECONDS after the curtain.
   */
  // From the clips themselves: drei creates the actions lazily, once the
  // group they animate has mounted, so they are not there on the first render.
  const landings = useMemo(
    () => Object.fromEntries(animations.map((clip) => [clip.name, landingTime(clip)])),
    [animations],
  )
  const lastLanding = useMemo(() => Math.max(0, ...Object.values(landings)), [landings])

  // Every clip plays once and holds its last frame.
  useEffect(() => {
    if (names && names.length > 0) {
      for (const name of names) {
        const action = actions[name]
        action.setLoop(LoopOnce)
        action.clampWhenFinished = true
        action.play()
      }
    } else {
      setIntroDone(true)
      markIntroDone()
    }
  }, [actions, names])

  /*
   * The clips start with the model, but stand still on their first frame
   * while the loading screen is up, and the camera's fly-in waits with them
   * (below) — the intro is the first thing a visitor sees, not something
   * already half over when the greeting lifts.
   */
  useEffect(() => {
    mixer.timeScale = curtainUp && lastLanding > 0 ? lastLanding / INTRO_SECONDS : 0
  }, [mixer, curtainUp, lastLanding])

  /*
   * Jump the intro to its end state: every clip to its last frame and the
   * camera's fly-in clock to its end. From there the camera eases home from
   * wherever it had got to, the same ease a drag lets go into, rather than
   * cutting — so a skip mid-flight still reads as motion, only quicker.
   */
  useEffect(() => {
    if (!introSkipped || introDone) return
    for (const name of names ?? []) {
      const action = actions[name]
      action.time = action.getClip().duration
    }
    mixer.update(0)
    introElapsedRef.current = INTRO_SECONDS
    setIntroDone(true)
    markIntroDone()
  }, [introSkipped, introDone, actions, names, mixer, markIntroDone])

  // A section opened by any route — a key, the number keys, the back button —
  // brings the device back together first.
  useEffect(() => {
    if (mode !== 'IDLE') setIsExploded(false)
  }, [mode])

  // Projects key toggle handler
  const handleProjectsKey = useCallback(() => {
    if (mode === 'IDLE') {
      openCarousel()
    } else if (mode === 'BROWSING') {
      closeCarousel()
    }
  }, [mode, openCarousel, closeCarousel])

  /*
   * Opening happens straight out of the click handler, with no await in
   * between, or a browser treats it as an unsolicited popup and blocks it.
   */
  /*
   * Where the three logo buttons go (SOCIAL_LINKS, in data/contact.js).
   *
   * Opened in a new tab so the scene is not torn down behind the visitor — the
   * intro, the wall's textures and any open print would all have to be rebuilt
   * on the way back. `noopener` is what stops the opened page reaching back
   * through `window.opener`; `noreferrer` keeps this URL out of its analytics.
   *
   * From the contact chapter, following one is reaching out, and resolves its
   * held chord; anywhere else that call does nothing.
   */
  const openLink = useCallback((url) => {
    useStoryStore.getState().resolveContact()
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  /*
   * About key: opens the about view. Closing is the overlay's × and Escape —
   * once the overlay is up it covers the device and takes the pointer, so the
   * key itself cannot be reached to close it.
   */
  const handleAboutKey = useCallback(() => {
    if (mode === 'IDLE') openAbout()
  }, [mode, openAbout])

  /*
   * The Sound key — once the lab key, which did nothing. It switches every
   * sound on the site, and glows amber while on: its own copy of the keycap
   * material, since the keys share one. Turning sound on clicks once more after
   * the press, because the press's own click was made while it was still off.
   */
  const soundOn = useStoryStore((s) => s.soundOn)
  const soundKeyMaterial = useMemo(() => {
    const m = materials.Key.clone()
    m.emissive = new THREE.Color(SOUND_GLOW)
    return m
  }, [materials])
  useEffect(() => () => soundKeyMaterial.dispose(), [soundKeyMaterial])
  useEffect(() => {
    soundKeyMaterial.emissiveIntensity = soundOn ? SOUND_GLOW_STRENGTH : 0
  }, [soundOn, soundKeyMaterial])
  const handleSoundKey = useCallback(() => {
    const on = !useStoryStore.getState().soundOn
    useStoryStore.getState().setSound(on)
    if (on) playMechanicalClick()
  }, [])

  const handleContactKey = useCallback(() => {
    if (mode === 'IDLE') openContact()
  }, [mode, openContact])

  const handleWritingKey = useCallback(() => {
    if (mode === 'IDLE') openWriting()
  }, [mode, openWriting])

  // Photography key handler
  const handlePhotographyKey = useCallback(() => {
    if (mode === 'IDLE') openGallery()
  }, [mode, openGallery])

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
    const step = Math.min(delta, MAX_EASE_STEP)

    /*
     * 0. Fade the device out for the gallery, and back in on the way home.
     *
     * The device is hidden for all three gallery modes. The camera only comes
     * back to the desk once the wall has faded out, so the device has to still
     * be gone at that moment; it fades back in on IDLE, in step with the stage
     * lights coming up.
     */
    if (group.current) {
      if (!fadeMaterials.current) {
        const seen = new Map()
        group.current.traverse((o) => {
          if (o.isMesh && o.material) seen.set(o.material, o.material.transparent)
        })
        fadeMaterials.current = [...seen].map(([material, transparent]) => ({ material, transparent }))
      }

      const target = inGallery ? 0 : 1
      const travel = step / DEVICE_FADE_SECONDS
      const fade = target > deviceFade.value
        ? Math.min(target, deviceFade.value + travel)
        : Math.max(target, deviceFade.value - travel)
      deviceFade.value = fade

      for (const { material, transparent } of fadeMaterials.current) {
        if (fade >= 1) {
          material.opacity = 1
          material.transparent = transparent
        } else {
          material.transparent = true
          material.opacity = fade
        }
      }
      // Out of the scene once invisible: the shadow pass renders depth and
      // ignores opacity, so a fully transparent device would still cast.
      group.current.visible = fade > 0

      /*
       * The fade hands the camera over, rather than a timer doing it.
       *
       * This is the same rule the cartridge follows: the animation reports that
       * it finished, so a slow machine cannot advance the mode before the thing
       * has actually happened. Timing it from outside meant the wall could take
       * the camera while the device was still half on screen, and the device
       * then vanished mid-cut. The guard inside the action makes the repeated
       * call a no-op.
       */
      if (fade === 0 && mode === 'OPENING_GALLERY') galleryOpened()
    }

    // This runs before each frame is drawn, so the second call is the first
    // that comes after one: the models are in and their shaders linked, and
    // the loading screen may lift.
    if (framesRun.current < 2 && ++framesRun.current === 2) markSceneReady()

    // 0b. Which keys have landed, and the end of the opening once the last has:
    // every clip put on its final frame then, rather than left to play out the
    // still seconds the clips were authored with.
    if (!introDone && curtainUp && names && names.length > 0) {
      let changed = false
      for (const name of names) {
        if (!landed.has(name) && actions[name].time >= landings[name]) changed = true
      }
      if (changed) setLanded(new Set(names.filter((n) => actions[n].time >= landings[n])))
      if (names.every((n) => actions[n].time >= landings[n])) {
        for (const name of names) actions[name].time = actions[name].getClip().duration
        mixer.update(0)
        introElapsedRef.current = INTRO_SECONDS
        setIntroDone(true)
        markIntroDone()
      }
    }

    // 1. Camera cinematic intro
    if (!introDone && !inGallery) {
      if (curtainUp) introElapsedRef.current += delta
      sampleCamPath(introElapsedRef.current, state.camera.position)
      state.camera.position.sub(camScratch.restTarget).applyQuaternion(restTurn).multiplyScalar(restScale).add(camScratch.restTarget)
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
    if (controlsRef.current && !inGallery) controlsRef.current.target.copy(camTargetRef.current)

    // Steer the up vector alongside the camera so neither pose relies on
    // lookAt guessing a roll. It converges on world up before the orbit
    // controls take over in IDLE.
    if (introDone && !inGallery) {
      const upK = 1 - Math.exp(-step * CAM_EASE)
      // The about view keeps the rest view's orientation; it only slides.
      camUpRef.current.lerp(atRest ? UP_IDLE : UP_OPEN, upK).normalize()
      state.camera.up.copy(camUpRef.current)
    }

    // 3a. Open pose: glide to the flat, screen-aligned top-down view
    if (introDone && !atRest && !inGallery) {
      const framed = PROJECT_MODES.has(mode)
      const k = 1 - Math.exp(-step * CAM_EASE)
      camTargetRef.current.lerp(framed ? camScratch.projectTarget : camScratch.openTarget, k)
      state.camera.position.lerp(framed ? camScratch.projectPos : camScratch.openPos, k)
      state.camera.lookAt(camTargetRef.current)
    }

    // 3b. Elastic camera snap-back — at rest, and under the about overlay,
    // which hides the device and wants the camera settled at its rest pose.
    //
    // The camera's direction from its target and its distance from it are
    // eased apart. A drag swings the camera round the device at a fixed
    // distance, and easing the position in a straight line back to rest cuts
    // the chord of that arc — through the inside of the sphere — so the camera
    // passed up to a fifth nearer the device on its way back, and the device
    // swelled and shrank as if zoomed. Easing the direction keeps the camera on
    // the sphere; easing the distance on its own lets the one move that does
    // change it, the carousel closing from higher up, still settle smoothly.
    //
    // Not a spherical ease: that works in angles, and orbiting the azimuth is
    // degenerate directly overhead, which is exactly where the camera sits
    // when the carousel closes — a hair of movement in the look target flips
    // the azimuth by half a turn, sending the camera around the far side and
    // landing it rolled over. Blending direction vectors has no angles in it.
    if (introDone && !isDraggingRef.current && atRest) {
      const k = 1 - Math.exp(-step * CAM_EASE)
      camTargetRef.current.lerp(camScratch.restTarget, k)
      const target = camTargetRef.current
      const offset = camScratch.offset.subVectors(state.camera.position, target)
      const rest = camScratch.restOffset.subVectors(camScratch.restPos, camScratch.restTarget)
      // Home only, and never with reduced motion: the faintest drift, so the
      // device reads as alive. The device itself still never moves — the
      // rest camera swings ±0.4° around it, which looks the same.
      if (mode === 'IDLE' && !reducedMotion) rest.applyAxisAngle(SWAY_AXIS, SWAY_RADIANS * Math.sin((state.clock.elapsedTime * 2 * Math.PI) / SWAY_PERIOD))
      const distance = MathUtils.lerp(offset.length(), rest.length(), k)
      offset.normalize().lerp(rest.normalize(), k).normalize()
      state.camera.position.copy(target).addScaledVector(offset, distance)
      state.camera.lookAt(target)
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
      {/*
        * Unmounted in the gallery rather than merely disabled.
        *
        * These controls bind whichever camera is default, and rebuild when that
        * changes. Rebuilding constructs a fresh OrbitControls, whose constructor
        * orients its camera at its target — so the moment the wall's camera
        * became default, this aimed it back at the device and the wall was
        * behind the view. Disabling does not help: `enabled` only gates the
        * per-frame update, not construction.
        */}
      {!inGallery && (
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          target={CAM_TARGET}
          enabled={introDone && mode === 'IDLE'}
          onStart={() => { isDraggingRef.current = true }}
          onEnd={() => { isDraggingRef.current = false }}
        />
      )}

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
            <DeviceButton name="Btn_GH" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={() => openLink(SOCIAL_LINKS.github)} position={[0.011, 0.007, -0.036]} description="GitHub Profile" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_1.geometry} material={materials.GitHubDark} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_GH_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_LI" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={() => openLink(SOCIAL_LINKS.linkedin)} position={[-0.011, 0.007, -0.036]} description="LinkedIn" labelDirection="left">
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_1.geometry} material={materials.LinkedInBlue} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_LI_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>
            <DeviceButton name="Btn_MD" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={() => openLink(SOCIAL_LINKS.medium)} position={[0.033, 0.007, -0.036]} description="Medium Articles" labelDirection="right">
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_1.geometry} material={materials.MediumBlack} />
              <mesh castShadow receiveShadow geometry={nodes.Btn_MD_2.geometry} material={materials.LegendWhite} />
            </DeviceButton>

            {/* Bottom Keys */}
            <DeviceButton name="Key_Bot_0" introDone={introDone} landed={landed} isExploded={isExploded} onClick={() => setIsExploded(!isExploded)} position={[-0.033, 0.007, 0.022]} description="Explode" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_1" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handleWritingKey} position={[-0.011, 0.007, 0.022]} description="Writing" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_2" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handleSoundKey} position={[0.011, 0.007, 0.022]} description={soundOn ? 'Sound on' : 'Sound off'} labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_1.geometry} material={soundKeyMaterial} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_2_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Bot_3" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handleContactKey} position={[0.033, 0.007, 0.022]} description="Contact Me" labelDirection="down">
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_1.geometry} material={materials.ContactAmber} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Bot_3_2.geometry} material={materials.Dark} />
            </DeviceButton>

            {/* Top Keys — Key_Top_0 is the "Projects" trigger */}
            <DeviceButton name="Key_Top_0" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handleProjectsKey} position={[-0.03, 0.007, -0.015]} description="Projects" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_0_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_1" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handleAboutKey} position={[0, 0.007, -0.015]} description="About me" labelDirection="up">
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_1.geometry} material={materials.Key} />
              <mesh castShadow receiveShadow geometry={nodes.Key_Top_1_2.geometry} material={materials.Dark} />
            </DeviceButton>
            <DeviceButton name="Key_Top_2" introDone={introDone} landed={landed} isExploded={isExploded} onCollapse={collapse} onClick={handlePhotographyKey} position={[0.03, 0.007, -0.015]} description="Photography" labelDirection="up">
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
