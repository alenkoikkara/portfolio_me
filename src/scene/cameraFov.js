/**
 * The device camera's field of view, for a window of a given shape.
 *
 * Shared by Device.jsx, which sets it on the camera, and aboutLayout.js, which
 * turns screen pixels into camera space with it — so the two cannot disagree.
 *
 * On a desktop-shaped window the *vertical* field of view is fixed, so the
 * device is the same share of the window's height however wide it is. It was
 * once the horizontal one for every window, which made the device a fixed
 * share of the width instead: noticeably bigger on an ultrawide than on a
 * 16:10 laptop, and smaller again on a 4:3 monitor. Narrow and portrait
 * windows keep that horizontal lock, because there width is what runs out —
 * a phone sees the whole device across its width, as it always has.
 */

/** Blender's horizontal field of view, degrees — the framing everything was authored in. */
export const HFOV = 36.24

/** The window shape whose framing the desktop keeps: what a 16:9 window has always seen. */
const REFERENCE_ASPECT = 16 / 9
/** From this aspect up, the window is desktop-shaped and the height is locked. */
const DESKTOP_ASPECT = 1.25

const TAN_HALF_H = Math.tan((HFOV * Math.PI) / 360)
const TAN_HALF_V_DESKTOP = TAN_HALF_H / REFERENCE_ASPECT

/**
 * tan of half the vertical field of view. Between a square window and a
 * desktop-shaped one the two rules are blended, so resizing a window across
 * the boundary eases the device's size rather than jumping it.
 */
export function tanHalfVertical(aspect) {
  const a = Math.max(aspect, 0.0001)
  if (a >= DESKTOP_ASPECT) return TAN_HALF_V_DESKTOP
  const narrow = TAN_HALF_H / a
  if (a <= 1) return narrow
  const t = (a - 1) / (DESKTOP_ASPECT - 1)
  return narrow + (TAN_HALF_V_DESKTOP - narrow) * t
}

/** The vertical field of view in degrees, as three's PerspectiveCamera wants it. */
export function verticalFov(aspect) {
  return (2 * Math.atan(tanHalfVertical(aspect)) * 180) / Math.PI
}
