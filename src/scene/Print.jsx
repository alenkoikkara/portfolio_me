import React, { memo } from 'react'
import { useSpring, animated as a } from '@react-spring/three'
import usePhotoTexture, { IMMEDIATE, fullStore, thumbStore } from './usePhotoTexture'

/**
 * One framed print on the photography wall.
 *
 * A print is a physical object on a wall, so it uses a standard material and
 * takes the room's light. With an unlit material every print would return the
 * same value regardless of its depth and tilt, and the depth jitter that gives
 * the wall its texture would be invisible.
 *
 * `inFrame` gates the texture, not the mesh: the plane keeps its place in the
 * wall while out of shot, drawn in the backing colour, so nothing reflows and
 * three's own culling still skips it.
 *
 * Prints neither cast nor receive shadows. The wall grows without limit as
 * photos are added, so a shadow camera that covered it would either have to
 * track the pan or be spread so thin it resolved nothing — and the depth jitter
 * reads through shading against the grazing wall light anyway, which is free.
 */
const PLACEHOLDER = '#15161a'
/** How far a print that is not the focused one is taken down. */
const DIM_OPACITY = 0.22

function Print({ photo, x, y, z, rot, w, h, inFrame, priority, focused, dimmed, entered, focusZ, focusScale, onSelect }) {
  // `priority` is the print's distance from the middle of the view when it came
  // into frame, so the queue fetches what is being looked at before what is
  // merely at the edge of it.
  const thumb = usePhotoTexture(thumbStore, photo.thumb, inFrame, { priority })
  /*
   * The full size is loaded the moment focus starts. The thumbnail is sized for
   * a 300 mm print and reads as soft once the same image fills the viewport, so
   * the swap happens under the fly-forward rather than after it. It waits for
   * neither the settle delay nor a queue slot: it is the one image the viewer
   * is actually waiting on.
   */
  const full = usePhotoTexture(fullStore, photo.src, focused, IMMEDIATE)
  const texture = full || thumb

  const spring = useSpring({
    // Every print mounts dark and comes up, so entering the gallery is a fade
    // rather than a cut onto a finished wall.
    from: { opacity: 0 },
    position: focused ? [x, y, focusZ] : [x, y, z],
    // Square up as it comes forward: the hand-hung tilt belongs to the wall.
    rotation: focused ? [0, 0, 0] : [0, 0, rot],
    scale: focused ? [focusScale, focusScale, 1] : [1, 1, 1],
    opacity: entered ? (dimmed ? DIM_OPACITY : 1) : 0,
    config: { tension: 200, friction: 26 },
  })

  return (
    <a.mesh
      position={spring.position}
      rotation={spring.rotation}
      scale={spring.scale}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(photo.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <planeGeometry args={[w, h]} />
      {texture ? (
        <a.meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0}
          transparent
          opacity={spring.opacity}
        />
      ) : (
        <a.meshBasicMaterial color={PLACEHOLDER} transparent opacity={spring.opacity} />
      )}
    </a.mesh>
  )
}

/*
 * Memoised because the wall re-renders whenever the set of prints in frame
 * changes, and every print is handed the same props it had before except the
 * few whose visibility actually flipped. Without this, one column scrolling
 * into view re-renders all of them.
 */
export default memo(Print)
