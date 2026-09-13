import React, { useEffect } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { GALLERY_FOV, GALLERY_LAYER, WALL_Z } from './galleryLayout'

/**
 * The gallery camera: a two-axis strafe at a fixed distance from the wall.
 *
 * Not an orbit and not a zoom. Looking at prints on a wall means moving along
 * it, and any rotation would put them into perspective, which is exactly what a
 * hung print should never be seen in.
 *
 * It is its own camera rather than the device camera repositioned. The two want
 * different near planes — the device is 92 mm across and needs a 1 mm near
 * plane, the wall is metres away — so sharing one would mean rewriting its
 * projection on every mode change.
 *
 * The pan target belongs to the wall, not to this component, because the wall
 * decides which prints to load from it and has to do so before this camera is
 * the one being rendered.
 */

/** Pointer travel, in px, past which a press is a pan and not a click. */
const DRAG_SLOP = 4
/** Metres panned per pixel of drag. */
const DRAG_SCALE = 0.0016
/** Metres panned per unit of wheel delta. */
const WHEEL_SCALE = 0.0012
/** Metres panned per arrow keypress. */
const KEY_STEP = 0.12
/** Fraction of the remaining distance covered per frame, at 60fps. */
const FOLLOW = 0.12
/** Longest frame the follow acts on, so a stalled tab does not jump the view. */
const MAX_STEP = 0.1

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

export default function GalleryCamera({ cameraRef, target, range, distance, active, interactive, focusTarget, dragRef }) {
  const { gl } = useThree()

  /*
   * Listeners live on the canvas, not the window, and only while panning is
   * actually possible. A wheel handler on the window with preventDefault would
   * take the page's scroll away everywhere, including from the overlay, and a
   * pointer handler there would start a pan from a press on an overlay button.
   * They come off entirely while a print is focused, and while the wall is
   * clearing on the way out, so nothing fights the camera for where it is.
   */
  useEffect(() => {
    if (!interactive || focusTarget) return undefined
    const el = gl.domElement

    const pan = (dx, dy) => {
      target.current.x = clamp(target.current.x + dx, range.minX, range.maxX)
      target.current.y = clamp(target.current.y + dy, range.minY, range.maxY)
    }

    const onWheel = (e) => {
      e.preventDefault()
      // Trackpad flicks keep firing after the fingers lift, so the momentum is
      // the browser's; the follow below only smooths what it sends.
      pan(e.deltaX * WHEEL_SCALE, -e.deltaY * WHEEL_SCALE)
    }

    let pointerId = null
    let last = null
    let travel = 0

    const onDown = (e) => {
      if (!e.isPrimary) return
      pointerId = e.pointerId
      last = { x: e.clientX, y: e.clientY }
      travel = 0
      dragRef.current = false
      el.setPointerCapture(e.pointerId)
    }

    const onMove = (e) => {
      if (pointerId !== e.pointerId || !last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      travel += Math.abs(dx) + Math.abs(dy)
      // Drag the wall, not the camera: the print under the pointer should stay
      // under it, so the camera goes the other way.
      pan(-dx * DRAG_SCALE, dy * DRAG_SCALE)
      last = { x: e.clientX, y: e.clientY }
      // Past the slop this press is a pan, and the click that ends it must not
      // also be read as picking whichever print happens to be underneath.
      if (travel > DRAG_SLOP) dragRef.current = true
    }

    const onUp = (e) => {
      if (pointerId !== e.pointerId) return
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      pointerId = null
      last = null
    }

    const onKey = (e) => {
      if (e.key === 'ArrowLeft') pan(-KEY_STEP, 0)
      else if (e.key === 'ArrowRight') pan(KEY_STEP, 0)
      else if (e.key === 'ArrowUp') pan(0, KEY_STEP)
      else if (e.key === 'ArrowDown') pan(0, -KEY_STEP)
      else return
      e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [interactive, focusTarget, gl, range, target, dragRef])

  // Seat the camera on the target before its first frame, so becoming the
  // default camera does not cut to the middle of a glide from the origin, and
  // let it see the layer the wall is on — it is the only camera that may.
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.layers.enable(GALLERY_LAYER)
      cameraRef.current.position.set(target.current.x, target.current.y, WALL_Z + distance)
    }
  }, [cameraRef, target, distance])

  useFrame((state, delta) => {
    const camera = cameraRef.current
    if (!camera) return

    // While a print is focused the camera glides to centre it rather than
    // following the pan target, which is left exactly where it was so that
    // closing the print returns the wall to where it was being read.
    const toX = focusTarget ? focusTarget.x : target.current.x
    const toY = focusTarget ? focusTarget.y : target.current.y

    const k = 1 - Math.pow(1 - FOLLOW, Math.min(delta, MAX_STEP) * 60)
    camera.position.x += (toX - camera.position.x) * k
    camera.position.y += (toY - camera.position.y) * k
    camera.position.z = WALL_Z + distance
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={active}
      fov={GALLERY_FOV}
      near={0.01}
      far={20}
    />
  )
}
