/**
 * Where the about view puts everything, for a given window.
 *
 * Pure arithmetic, like galleryLayout.js, so it can be tested without a GPU.
 *
 * The about view is a page laid over the scene: a pane of frosted glass blurs
 * the device away, and on it sit a constellation of milestones and, to its
 * right, the bio. None of it belongs to the world — it is laid out in screen pixels and
 * then placed in *camera space*, at fixed depths in front of the lens, by a
 * group that rides with the camera (see AboutView.jsx). So it fills the frame
 * exactly whatever the camera is doing, and nothing here needs the rest pose.
 */

/** Horizontal field of view, degrees — must match `CAM_HFOV` in Device.jsx. */
export const HFOV = 36.24

export const PANEL_WIDTH = 340
/** Margin kept clear at the window's edges, in CSS px. */
const EDGE = 24
const GAP = 16
/** Between the constellation and the bio, side by side. */
const COLUMN_GAP = 64
/** The widest the two columns together grow, so a big screen does not strand them. */
const MAX_CONTENT = 1180

/*
 * The title and close button sit at the top of the window and the key hint at
 * the bottom; the composition stays clear of both rows.
 */
const CHROME_TOP = 64
const CHROME_BOTTOM = 56

/*
 * Side by side needs a constellation wide enough for six labelled stars. Labels
 * on the same side of the path are two milestones apart, about 35% of its span,
 * and each is up to 128 px wide, so the path needs about 370 px plus a label's
 * width at either end: 500 px of sky. Whether a window gives it that is decided
 * from the sky it would actually get, not from a window width — at 1024 px wide
 * it gets 476, and two labels above the path touched. Short of it, or on a
 * window taller than wide, the constellation goes above the bio instead.
 */
const SIDE_MIN_SKY = 500
const SIDE_MIN_ASPECT = 1.05
/** The constellation's height, side by side: tall enough for the path to rise and fall. */
const SIDE_SKY_HEIGHT = 420
/*
 * Stacked, it is a band across the top: smaller labels, no subtitles. How
 * tall, by the number of stars in its figure — measured, not a formula: each
 * height is one where every label clears every other label and star on every
 * window from 375 px wide up. It does not grow steadily, because a taller band
 * scales the figure up and reshuffles which spots are free: seven stars that
 * fit at 240 collide at 270. Only ten needs the full 320, and every pixel the
 * band takes is one the bio below it loses. (A 320 px phone cannot fit ten.)
 */
const STACKED_SKY_HEIGHTS = [200, 200, 200, 200, 200, 220, 240, 260, 280, 320]
export const stackedSkyHeight = (count) =>
  STACKED_SKY_HEIGHTS[Math.min(Math.max(count, 1), STACKED_SKY_HEIGHTS.length) - 1]

/*
 * Depths in front of the lens, in metres. The glass stands in front of the
 * device — about half a metre away at rest — and everything drawn on it stands
 * in front of the glass, so the glass blurs the device and nothing else.
 */
export const GLASS_DEPTH = 0.3
export const CONTENT_DEPTH = 0.25

/*
 * The glass is a pane, not a sheet running off the screen: its edges are what
 * bend the light and catch the highlight, so they have to be in view. Inset
 * from the window by this much, with corners of this radius, and a bevel —
 * the band inside the edge that acts as a lens — this wide. In CSS px.
 */
const GLASS_INSET = 12
const GLASS_RADIUS = 28
const GLASS_BEVEL = 22

/*
 * The order the about view draws over the scene: the glass in front of the
 * device, then the constellation on the glass, with depth testing off so the
 * device can never cut into a star.
 */
export const GLASS_ORDER = 10
export const CONTENT_ORDER = 11

const tanHalf = Math.tan((HFOV * Math.PI) / 360)

/** Metres per screen pixel, on a plane facing the camera `depth` metres away. */
export function pixelAt(depth, width) {
  return (2 * depth * tanHalf) / Math.max(width, 1)
}

/**
 * drei draws one CSS pixel of a transformed `<Html>` as `distanceFactor / 400`
 * world units. Set to one screen pixel at the text's depth, it renders the text
 * at exactly its CSS size: legible on a phone, where a fixed factor shrinks it
 * to a quarter, and sharp, because the browser never has to resample it.
 */
export function distanceFactorAt(depth, width) {
  return 400 * pixelAt(depth, width)
}

/** A screen pixel, `depth` metres in front of the camera, in camera space. */
export function cameraSpaceAt(px, py, depth, width, height) {
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)
  const frameWidth = 2 * depth * tanHalf
  return [(px / w - 0.5) * frameWidth, (0.5 - py / h) * frameWidth * (h / w), -depth]
}

/**
 * The about view for a window `width` × `height` CSS px and a timeline of
 * `count` milestones: where the bio and the constellation's region (`sky`) go,
 * in screen pixels, and the pane of glass they sit on.
 */
export function aboutLayout(width, height, count) {
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)
  const available = h - CHROME_TOP - CHROME_BOTTOM
  const content = Math.min(w - 6 * EDGE, MAX_CONTENT)
  const sideSky = content - PANEL_WIDTH - COLUMN_GAP
  const side = sideSky >= SIDE_MIN_SKY && w / h >= SIDE_MIN_ASPECT

  let sky
  let panel
  if (side) {
    // Two columns, centred together: the constellation, then the bio.
    const left = (w - content) / 2
    const centreY = CHROME_TOP + available / 2
    const skyHeight = Math.min(SIDE_SKY_HEIGHT, available)
    panel = {
      x: left + content - PANEL_WIDTH,
      y: centreY,
      width: PANEL_WIDTH,
      maxHeight: available,
      anchor: 'side',
    }
    sky = { x0: left, x1: panel.x - COLUMN_GAP, y0: centreY - skyHeight / 2, y1: centreY + skyHeight / 2 }
  } else {
    // The constellation as a band across the top, the bio under it.
    sky = { x0: EDGE, x1: w - EDGE, y0: CHROME_TOP, y1: CHROME_TOP + stackedSkyHeight(count) }
    const top = sky.y1 + 2 * GAP
    panel = {
      x: w / 2,
      y: top,
      width: Math.min(PANEL_WIDTH, w - 2 * EDGE),
      maxHeight: Math.max(h - top - EDGE, 160),
      anchor: 'stacked',
    }
  }

  /*
   * Where a milestone label may go: the page around the constellation, short
   * of the bio and the chrome rows — a crowded figure's labels can then spill
   * out of the sky into free space rather than onto each other.
   */
  const labelBounds = side
    ? { x0: EDGE, x1: panel.x - GAP, y0: CHROME_TOP, y1: h - CHROME_BOTTOM }
    : { x0: EDGE / 2, x1: w - EDGE / 2, y0: CHROME_TOP, y1: sky.y1 }

  const glassPixel = pixelAt(GLASS_DEPTH, w)
  return {
    layout: side ? 'side' : 'stacked',
    sky,
    labelBounds,
    panel: {
      ...panel,
      position: cameraSpaceAt(panel.x, panel.y, CONTENT_DEPTH, w, h),
      distanceFactor: distanceFactorAt(CONTENT_DEPTH, w),
    },
    content: {
      depth: CONTENT_DEPTH,
      // Metres per screen pixel on the content plane, for sizing in pixels.
      pixel: pixelAt(CONTENT_DEPTH, w),
      distanceFactor: distanceFactorAt(CONTENT_DEPTH, w),
      origin: cameraSpaceAt(0, 0, CONTENT_DEPTH, w, h),
    },
    // The plane the pane is drawn on fills the frame; the pane's rounded shape
    // inside it is cut by its shader, in pixels.
    glass: {
      depth: GLASS_DEPTH,
      frameWidth: w * glassPixel,
      frameHeight: h * glassPixel,
      inset: GLASS_INSET,
      radius: GLASS_RADIUS,
      bevel: GLASS_BEVEL,
    },
  }
}
