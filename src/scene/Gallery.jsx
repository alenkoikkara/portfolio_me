import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PHOTOS } from '../data/photos'
import useDeviceStore, { GALLERY_MODES } from './useDeviceStore'
import GalleryCamera from './GalleryCamera'
import Print from './Print'
import { fullStore, setPhotoRenderer, thumbStore } from './usePhotoTexture'
import {
  GALLERY_LAYER,
  PRINT_WIDTH,
  WALL_Z,
  layoutWall,
  panRange,
  viewExtents,
  wallDistance,
} from './galleryLayout'

/**
 * How far beyond the frame a print still counts as in frame, in metres.
 *
 * Deliberately narrow — a little over half a print — so that what is fetched
 * stays close to what is actually on screen. It is not zero because a print
 * that only starts loading once its edge appears arrives visibly late; this
 * buys roughly one row of warning. The queue behind it is what keeps a wide
 * margin from mattering: prints just outside the frame wait their turn rather
 * than competing with the ones being looked at.
 */
const MARGIN = PRINT_WIDTH * 0.6
/**
 * Pan speed above which loading waits, in metres per second.
 *
 * A print is 300 mm across, so this is about two prints a second — quicker than
 * anyone reads a wall, and therefore a fair line between looking and travelling.
 */
const PAN_SETTLE_SPEED = 0.5
/*
 * How long the prints take to clear before the camera hands back, in ms.
 *
 * Both cuts between the desk and the wall are arranged to happen on an empty
 * frame of exactly one colour, so there is nothing in either of them to see.
 * Going in, the device fade reports when it is done and the camera follows it.
 * Coming out there is nothing physical to report, so this covers the springs
 * taking the prints down — long enough for them to settle, since a cut that
 * lands early would show the wall disappearing rather than the room changing.
 */
const EXIT_MS = 600
/**
 * The room behind the prints, matching `--stage-bg` of `.stage--dark`.
 *
 * Kept in step with index.css by hand. It has to be the same colour the page is
 * transitioning to, because for one frame at the cut the viewer sees one replace
 * the other over the whole frame.
 */
const BACKDROP = '#0b0c10'
/** How close to the camera a focused print comes, as a fraction of the wall distance. */
const FOCUS_GAP_RATIO = 0.35
/** Fraction of the frame a focused print fills on its tighter axis. */
const FOCUS_FILL = 0.88

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function Wall() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedPhotoId = useDeviceStore((s) => s.focusedPhotoId)
  const focusPhoto = useDeviceStore((s) => s.focusPhoto)
  const galleryClosed = useDeviceStore((s) => s.galleryClosed)

  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(size.height, 1)

  const { prints, bounds } = useMemo(() => layoutWall(PHOTOS), [])
  const distance = useMemo(() => wallDistance(aspect), [aspect])
  const range = useMemo(() => panRange(bounds, aspect, distance), [bounds, aspect, distance])
  const view = useMemo(() => viewExtents(aspect, distance), [aspect, distance])

  /*
   * The pan target lives here rather than on the camera because the wall reads
   * it to decide which prints to load, and it has to be able to do that before
   * the gallery camera is the one being rendered.
   */
  /*
   * Seeded here rather than in an effect, so the very first frame already reads
   * the right place. Starting at the origin and moving to the top of the wall
   * afterwards is a jump of the whole wall in one frame, which the pan-speed
   * gate below quite reasonably reads as a flick — and then holds every load
   * for as long as it takes that reading to decay, leaving the wall blank on
   * the one occasion it most needs to be full.
   */
  const panSpeed = useRef(0)
  const lastTarget = useRef(null)
  const target = useRef(null)
  if (!target.current) {
    target.current = { x: (range.minX + range.maxX) / 2, y: range.maxY }
  }
  const dragRef = useRef(false)
  const galleryCameraRef = useRef()

  // Re-clamp on every resize so a viewport change cannot strand the view off
  // the edge of the wall.
  useEffect(() => {
    target.current.x = clamp(target.current.x, range.minX, range.maxX)
    target.current.y = clamp(target.current.y, range.minY, range.maxY)
    // That clamp can move the view without anyone having panned, so drop the
    // speed baseline rather than let the next frame read it as travel.
    lastTarget.current = null
  }, [range])

  /* ─── Which prints are in frame ─── */

  /*
   * A flat wall viewed head-on makes this plain arithmetic: the frame is a
   * rectangle in wall coordinates and a print is in it when the two overlap.
   *
   * Doing it with THREE.Frustum instead would mean building a frustum and a
   * matrix per print per frame — tens of thousands of throwaway objects a
   * second at this wall size — to answer a question two comparisons can.
   */
  const flags = useRef(new Uint8Array(prints.length))
  const [inFrame, setInFrame] = useState(() => new Map())

  useFrame((state, delta) => {
    /*
     * Hold loading while the view is travelling. Prints still come into frame
     * and draw their backing colour, but nothing is fetched until the pan slows
     * to reading speed — so flicking the length of the wall costs no requests,
     * and the images arrive for wherever it comes to rest.
     */
    if (!lastTarget.current) lastTarget.current = { x: target.current.x, y: target.current.y }
    const moved = Math.hypot(
      target.current.x - lastTarget.current.x,
      target.current.y - lastTarget.current.y
    )
    lastTarget.current.x = target.current.x
    lastTarget.current.y = target.current.y
    // Smoothed, so one long frame cannot read as a flick and stall the queue.
    panSpeed.current += (moved / Math.max(delta, 1 / 240) - panSpeed.current) * 0.25
    thumbStore.setPaused(panSpeed.current > PAN_SETTLE_SPEED)

    const left = target.current.x - view.halfWidth - MARGIN
    const right = target.current.x + view.halfWidth + MARGIN
    const bottom = target.current.y - view.halfHeight - MARGIN
    const top = target.current.y + view.halfHeight + MARGIN

    let changed = false
    for (let i = 0; i < prints.length; i++) {
      const p = prints[i]
      const visible =
        p.x + p.w / 2 >= left && p.x - p.w / 2 <= right &&
        p.y + p.h / 2 >= bottom && p.y - p.h / 2 <= top
          ? 1
          : 0
      if (flags.current[i] !== visible) {
        flags.current[i] = visible
        changed = true
      }
    }
    /*
     * Only allocate when the answer actually changed; panning within a row
     * changes nothing and must not re-render the wall every frame.
     *
     * The value is how far the print was from the middle of the view at the
     * moment it entered, which orders the load queue. A print already in frame
     * keeps the figure it came in with, so this prop stays put while panning
     * and does not re-render the wall on every frame of a drag.
     */
    if (changed) {
      const next = new Map()
      for (let i = 0; i < prints.length; i++) {
        if (!flags.current[i]) continue
        const p = prints[i]
        const held = inFrame.get(p.photo.id)
        next.set(
          p.photo.id,
          held ?? Math.hypot(p.x - target.current.x, p.y - target.current.y)
        )
      }
      setInFrame(next)
    }
  })

  /* ─── Entering and leaving ─── */

  /*
   * The fade-in belongs to the springs, which start every print at zero opacity
   * on mount and animate to this. Deriving it from the mode rather than holding
   * it in state is what keeps it honest on a slow first frame: a flag set from
   * a requestAnimationFrame can be cancelled by the very mode change it was
   * racing, and the wall then stays invisible for good.
   *
   * Only on GALLERY, not from the moment the wall mounts. The wall spends
   * OPENING_GALLERY off-camera getting its textures on the wire, and if the
   * prints finished fading up during that beat the cut would reveal a complete
   * wall all at once. Holding them back means the cut lands on an empty dark
   * frame and the prints come up into it.
   */
  const entered = mode === 'GALLERY'

  /*
   * Link the wall's shaders before the camera changes hands.
   *
   * The same rule the cartridges follow, and for the same reason: a driver cannot
   * draw a material until its program has linked, and every print's material
   * reaches the frame at once when the gallery camera takes over. Compiling has to
   * use *that* camera — the wall and its lights are on their own layer, so
   * compiling against the device camera would link a program for a scene with no
   * lights in it and the real one would still be linked at the cut.
   */
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    setPhotoRenderer(gl)
    return () => setPhotoRenderer(null)
  }, [gl])

  useEffect(() => {
    if (mode !== 'OPENING_GALLERY' || !galleryCameraRef.current) return
    gl.compileAsync(scene, galleryCameraRef.current)
  }, [mode, gl, scene])

  /*
   * The way in is reported by the device's fade, over in Device.jsx, so that the
   * camera cannot change hands while the desk is still on screen. The way out
   * has no such animation to report — the prints are springs and the room is a
   * CSS transition — so this one beat stays on a timer.
   */
  useEffect(() => {
    if (mode !== 'CLOSING_GALLERY') return undefined
    const timer = setTimeout(galleryClosed, EXIT_MS)
    return () => clearTimeout(timer)
  }, [mode, galleryClosed])

  /* ─── Focus ─── */

  const focused = useMemo(
    () => prints.find((p) => p.photo.id === focusedPhotoId) || null,
    [prints, focusedPhotoId]
  )
  // The camera centres the focused print, so the print only has to come
  // forward — it never needs to know where the camera is.
  const focusTarget = useMemo(
    () => (focused ? { x: focused.x, y: focused.y } : null),
    [focused]
  )

  const focusGap = distance * FOCUS_GAP_RATIO
  const focusZ = distance - focusGap
  const focusView = useMemo(() => viewExtents(aspect, focusGap), [aspect, focusGap])

  const handleSelect = useCallback(
    (id) => {
      // A press that turned into a pan ends in a click on whatever print the
      // pointer landed over; that must not also open it.
      if (dragRef.current) return
      focusPhoto(focusedPhotoId === id ? null : id)
    },
    [focusPhoto, focusedPhotoId]
  )

  const handleBackdrop = useCallback(() => {
    if (dragRef.current) return
    focusPhoto(null)
  }, [focusPhoto])

  /* ─── Wall light ─── */

  const wallRef = useRef()
  /*
   * Put everything in the wall — prints, backdrop and its two lights — on the
   * gallery layer, so the device camera cannot render any of it. The tree is
   * fixed once mounted: prints swap materials as textures arrive but no meshes
   * come or go, so this runs once per layout.
   */
  useLayoutEffect(() => {
    if (!wallRef.current) return
    wallRef.current.traverse((o) => o.layers.set(GALLERY_LAYER))
  }, [prints])

  /*
   * Let the pointer reach the layer too.
   *
   * A raycaster tests layer 0 and nothing else unless told otherwise, so moving
   * the wall onto its own layer — which is what keeps it out of the device
   * camera — also takes every print out of reach of a click. Nothing errors; the
   * prints simply stop responding. Enabled only while the wall is mounted, so
   * the device scene keeps raycasting exactly what it did before.
   */
  const raycaster = useThree((s) => s.raycaster)
  useEffect(() => {
    raycaster.layers.enable(GALLERY_LAYER)
    return () => raycaster.layers.disable(GALLERY_LAYER)
  }, [raycaster])

  const wallLight = useRef()
  useEffect(() => {
    const light = wallLight.current
    if (!light || !light.parent) return undefined
    // A directional light aims at its target object, and an unparented target
    // sits at the world origin — which here is the device, five metres in front
    // of the wall. Aiming it explicitly is what makes the light graze the wall
    // rather than hit it head-on, and grazing light is the only thing that
    // makes the depth jitter visible.
    light.target.position.set(0, -0.35, 0)
    light.parent.add(light.target)
    return () => light.target.removeFromParent()
  }, [])

  if (import.meta.env.DEV) {
    window.__gallery = { prints, bounds, range, target, inFrame, distance }
  }

  return (
    <>
      <GalleryCamera
        cameraRef={galleryCameraRef}
        target={target}
        range={range}
        distance={distance}
        // The camera stays with the wall while the prints clear, so the cut
        // back to the desk happens on an empty frame rather than over them.
        active={mode === 'GALLERY' || mode === 'CLOSING_GALLERY'}
        interactive={mode === 'GALLERY'}
        focusTarget={focusTarget}
        dragRef={dragRef}
      />

      <group ref={wallRef} position={[0, 0, WALL_Z]}>
        {/*
          * The room behind the prints. It is large enough to fill the frame at
          * any pan, which is what lets the switch onto this camera land on a
          * dark frame instead of on whatever the device scene was showing.
          */}
        <mesh position={[0, 0, -0.06]} onClick={handleBackdrop}>
          <planeGeometry args={[60, 60]} />
          {/*
            * Unlit and untone-mapped, so it renders as exactly the colour named
            * above. A lit material here would come out of the tone mapper some
            * way off that value, and the gap between it and the page behind the
            * canvas is precisely what showed as a flash at the cut.
            */}
          <meshBasicMaterial color={BACKDROP} toneMapped={false} />
        </mesh>

        <ambientLight intensity={0.45} />
        <directionalLight ref={wallLight} position={[0.9, 0.8, 1.4]} intensity={2.1} color="#fff4e8" />

        {prints.map((p) => (
          <Print
            key={p.photo.id}
            photo={p.photo}
            x={p.x}
            y={p.y}
            z={p.z}
            rot={p.rot}
            w={p.w}
            h={p.h}
            inFrame={inFrame.has(p.photo.id)}
            priority={inFrame.get(p.photo.id) ?? 0}
            focused={focusedPhotoId === p.photo.id}
            dimmed={focusedPhotoId !== null && focusedPhotoId !== p.photo.id}
            entered={entered}
            focusZ={focusZ}
            focusScale={Math.min(
              (2 * focusView.halfWidth * FOCUS_FILL) / p.w,
              (2 * focusView.halfHeight * FOCUS_FILL) / p.h
            )}
            onSelect={handleSelect}
          />
        ))}
      </group>
    </>
  )
}

/**
 * The photography wall, mounted only while it is on screen.
 *
 * Unmounting is what releases its textures: every print's hold on the texture
 * stores goes with it, so leaving the gallery hands back all of its VRAM rather
 * than parking it for a visitor who may never come back.
 */
export default function Gallery() {
  const mode = useDeviceStore((s) => s.mode)
  const mounted = GALLERY_MODES.has(mode)

  /*
   * Hand back what the caches were deliberately holding on to.
   *
   * Panning a print out of shot is not the same as leaving the room: the full
   * store keeps up to three full-resolution textures so stepping back through
   * recent photos is instant, and the thumbnails sit out a grace period so a
   * small pan does not reload a column. Neither is worth keeping for a visitor
   * who has closed the gallery, and three full-resolution textures is the
   * largest single thing this scene can leave behind.
   */
  useEffect(() => {
    if (mounted) return
    // Never leave the queue held for the next visit.
    thumbStore.setPaused(false)
    fullStore.clear()
    thumbStore.clear()
  }, [mounted])

  if (!mounted) return null
  return <Wall />
}
