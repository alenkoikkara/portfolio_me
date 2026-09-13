/**
 * Lay the photography wall out from aspect ratios alone.
 *
 * Nothing here is hand-placed: adding a photo is one entry in the manifest and
 * the pack absorbs it. The wall hangs in the x/y plane and grows downward from
 * y = 0, which is its top edge.
 *
 * Real-world metres, like the rest of the scene — a print is 300 mm across.
 */
export const COLUMNS = 5
export const PRINT_WIDTH = 0.3
export const GAP = 0.04
/** Column pitch: the width a print occupies including the gap beside it. */
export const COLUMN_PITCH = PRINT_WIDTH + GAP
/** How far prints vary in depth, in metres — enough to catch the light differently. */
const DEPTH_JITTER = 0.008
/** How far prints tilt, in radians. Roughly half a degree at the extremes. */
const ROT_JITTER = 0.015

/**
 * FNV-1a over the id, returning a 32-bit unsigned integer.
 *
 * Depth and tilt are drawn from this rather than from Math.random so a photo
 * hangs in the same place in every session and every build — the wall looks
 * hand-hung but is not re-hung on each reload.
 */
function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

/**
 * Pull an independent 0..1 value out of one hash.
 *
 * Depth and tilt take different streams. Deriving both from a single seed would
 * correlate them, and a wall where every print that sits deeper also tilts the
 * same way reads as a pattern rather than as hand-hung.
 */
function stream(h, salt) {
  return ((Math.imul(h ^ salt, 2246822519) >>> 0) % 100000) / 100000
}

/**
 * Masonry-pack photos into fixed-width columns.
 *
 * @param {Array<{id: string, aspect: number}>} photos
 * @param {number} columns
 * @returns {{ prints: Array<object>, bounds: {minX: number, maxX: number, minY: number, maxY: number} }}
 */
export function layoutWall(photos, columns = COLUMNS) {
  const columnHeights = new Array(columns).fill(0)
  const prints = []

  for (const photo of photos) {
    // Shortest column first, so the wall stays level as it grows.
    let col = 0
    for (let i = 1; i < columns; i++) {
      if (columnHeights[i] < columnHeights[col]) col = i
    }

    const w = PRINT_WIDTH
    const h = PRINT_WIDTH / photo.aspect
    const x = (col - (columns - 1) / 2) * COLUMN_PITCH
    const y = -columnHeights[col] - h / 2

    const seed = hashString(photo.id)
    const z = (stream(seed, 0x9e3779b9) - 0.5) * DEPTH_JITTER
    const rot = (stream(seed, 0x85ebca6b) - 0.5) * ROT_JITTER

    prints.push({ photo, x, y, z, rot, w, h })
    columnHeights[col] += h + GAP
  }

  const halfWall = ((columns - 1) / 2) * COLUMN_PITCH + PRINT_WIDTH / 2
  const tallest = columnHeights.length ? Math.max(...columnHeights) : 0

  return {
    prints,
    bounds: {
      minX: -halfWall,
      maxX: halfWall,
      // The pack grows downward from the top edge; the last gap is not content.
      minY: -Math.max(0, tallest - GAP),
      maxY: 0,
    },
  }
}

/**
 * Where the wall hangs, in world space.
 *
 * Far behind the device rather than on top of it. The house rule is that the
 * device never moves — every "the device slid away" effect in this scene is the
 * camera changing pose — so the gallery is somewhere else entirely and its
 * camera simply never has the device in shot. Nothing has to be animated out of
 * the way, and nothing can be left half-moved by an interrupted transition.
 */
export const WALL_Z = -5

/**
 * Render layer the wall and its lights live on.
 *
 * The device camera must never see any of it. The backdrop in particular is a
 * very large plane — it has to stay filled at any pan, and the wall grows
 * without limit as photos are added — and a plane that size hanging five metres
 * behind the device is squarely in the device camera's view, however far off to
 * one side its centre is. It used to black out the whole desk scene the instant
 * the wall mounted, before the device had finished fading.
 *
 * Sizing the plane to stay out of frame would mean re-deriving it every time the
 * wall or the viewport changed, and being wrong by a little would bring the
 * whole failure back. A layer is exact at any size: only the gallery camera
 * enables it, so nothing else can ever render it.
 *
 * The wall's lights sit on it too, which also keeps them off the device — a
 * light only reaches what shares a layer with it.
 */
export const GALLERY_LAYER = 1

/** Vertical field of view of the gallery camera, in degrees. */
export const GALLERY_FOV = 35

/**
 * How much empty wall may show past the outermost prints when panned hard over.
 *
 * One gap — the same spacing that sits between prints — so the edge of the wall
 * reads as the layout breathing rather than as having run out of pictures.
 *
 * It used to be half a column pitch, which is a quarter of the screen's height.
 * That bought nothing at the vertical extremes: panning to the bottom put a band
 * of empty backdrop under every column at once, and the same above, so the wall
 * appeared to end well before the last row. The horizontal extremes are checked
 * against this too — the outermost column still comes fully into view.
 */
export const PAN_PADDING = GAP

/**
 * How many column pitches should span the viewport width.
 *
 * This is what makes the wall responsive: rather than reflowing the layout for
 * small screens — which would re-hang every print and lose the stable positions
 * the deterministic pack exists to give — the camera moves closer, so a phone
 * sees two columns at the same physical print size a desktop sees four across.
 */
function columnsAcross(aspect) {
  if (aspect < 0.85) return 2
  if (aspect < 1.4) return 2.8
  return 3.6
}

/** Distance from the wall that puts `columnsAcross` column pitches on screen. */
export function wallDistance(aspect) {
  const halfHeight = (columnsAcross(aspect) * COLUMN_PITCH) / Math.max(aspect, 0.0001) / 2
  return halfHeight / Math.tan((GALLERY_FOV * Math.PI) / 180 / 2)
}

/** Half-extents of what the gallery camera sees at the wall, in metres. */
export function viewExtents(aspect, distance) {
  const halfHeight = Math.tan((GALLERY_FOV * Math.PI) / 180 / 2) * distance
  return { halfWidth: halfHeight * aspect, halfHeight }
}

/**
 * Clamp range for the camera, so panning stops at the edges of the wall.
 * When the wall is smaller than the viewport the range collapses to its centre.
 */
export function panRange(bounds, aspect, distance) {
  const { halfWidth, halfHeight } = viewExtents(aspect, distance)
  const span = (lo, hi, half) => {
    const a = lo + half - PAN_PADDING
    const b = hi - half + PAN_PADDING
    return a > b ? [(lo + hi) / 2, (lo + hi) / 2] : [a, b]
  }
  const [minX, maxX] = span(bounds.minX, bounds.maxX, halfWidth)
  const [minY, maxY] = span(bounds.minY, bounds.maxY, halfHeight)
  return { minX, maxX, minY, maxY }
}
