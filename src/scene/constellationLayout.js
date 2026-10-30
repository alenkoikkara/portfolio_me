/**
 * Where the constellation's stars, lines and labels go, in screen pixels.
 *
 * Pure arithmetic over the about layout's `sky` — the region beside (or above)
 * the bio — so it can be tested without a GPU. Constellation.jsx draws these
 * pixels on the content plane in front of the glass.
 *
 * The milestones take the shape of a real constellation with exactly as many
 * stars as there are milestones (about/constellations.generated.js): add one
 * to the timeline and the whole figure becomes the next constellation up.
 */
import { CONSTELLATIONS } from './about/constellations.generated'

/** The most milestones a figure exists for. */
export const MAX_MILESTONES = Math.max(...Object.keys(CONSTELLATIONS).map(Number))

/** Gap between a star and its label, in CSS px — must match `.milestone--*` in about.css. */
export const LABEL_OFFSET = 12
/** A star's clearance: its halo, plus a little air. */
const STAR_CLEARANCE = 10
/** Height of the row under the figure that names it. */
const NAME_ROW = { side: 36, stacked: 26 }

/*
 * Label sizes, estimated from their text so a label is never given room it
 * does not need, nor too little: rough per-character widths for the year,
 * title and subtitle at their CSS sizes (about.css). The browser check in
 * Verifying changes measures the real ones.
 */
const TYPE = {
  side: { title: 7.4, sub: 5.9, height: 52, heightNoSub: 34 },
  stacked: { title: 6.4, sub: 0, height: 30, heightNoSub: 30 },
}

/*
 * Above this many stars a figure crowds them too closely for a three-line
 * label at each, so its labels drop the subtitle: year and title only.
 */
export const COMPACT_ABOVE = 5

function labelSize(milestone, kind, compact) {
  const t = TYPE[kind]
  const sub = kind === 'side' && !compact && milestone.subtitle
  const width = Math.max(milestone.title.length * t.title, sub ? milestone.subtitle.length * t.sub : 0, 36) + 8
  return { width, height: sub ? t.height : t.heightNoSub }
}

/** The ambient stars: how many, and the space they keep from everything readable. */
const AMBIENT_COUNT = { side: 40, stacked: 24 }
const AMBIENT_CLEARANCE = 18

/*
 * A seeded generator, so the ambient stars stand in the same places on every
 * visit — a layout that reshuffled itself on each reload would read as noise
 * rather than as something drawn.
 */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const inside = (x, y, r, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))

/** The bio column's box on screen, from its anchor. */
export function panelRect(panel) {
  if (panel.anchor === 'side') {
    return { x0: panel.x, x1: panel.x + panel.width, y0: panel.y - panel.maxHeight / 2, y1: panel.y + panel.maxHeight / 2 }
  }
  return { x0: panel.x - panel.width / 2, x1: panel.x + panel.width / 2, y0: panel.y, y1: panel.y + panel.maxHeight }
}

/** The figure for a timeline of `count` milestones. */
export function figureFor(count) {
  return CONSTELLATIONS[Math.min(Math.max(count, 1), MAX_MILESTONES)]
}

/*
 * Where a label may sit around its star, in order of preference: straight
 * below or above reads best, then beside, then the diagonals — which are what
 * find room in a tight cluster like Vega's corner of Lyra.
 */
export const LABEL_SIDES = ['below', 'above', 'right', 'left', 'below-right', 'below-left', 'above-right', 'above-left']

/** A label's box, for a star at (x, y), on the given side of it. */
function labelBox(x, y, side, { width, height }) {
  const o = LABEL_OFFSET
  const d = o * 0.7
  switch (side) {
    case 'above': return { x0: x - width / 2, x1: x + width / 2, y0: y - o - height, y1: y - o }
    case 'below': return { x0: x - width / 2, x1: x + width / 2, y0: y + o, y1: y + o + height }
    case 'right': return { x0: x + o, x1: x + o + width, y0: y - height / 2, y1: y + height / 2 }
    case 'left': return { x0: x - o - width, x1: x - o, y0: y - height / 2, y1: y + height / 2 }
    case 'below-right': return { x0: x + d, x1: x + d + width, y0: y + d, y1: y + d + height }
    case 'below-left': return { x0: x - d - width, x1: x - d, y0: y + d, y1: y + d + height }
    case 'above-right': return { x0: x + d, x1: x + d + width, y0: y - d - height, y1: y - d }
    default: return { x0: x - d - width, x1: x - d, y0: y - d - height, y1: y - d }
  }
}

/**
 * The figure's stars with their milestones and label sides, the lines joining
 * them, the figure's name, and the ambient stars, in screen pixels.
 */
export function constellationLayout(layout, milestones) {
  const kind = layout.layout
  const sky = layout.sky
  const figure = figureFor(milestones.length)
  const shown = milestones.slice(0, figure.stars.length)
  const compact = shown.length > COMPACT_ABOVE
  const sizes = shown.map((m) => labelSize(m, kind, compact))
  const nameRow = NAME_ROW[kind]

  /*
   * Fit the figure to the sky, keeping its shape, with room left at every edge
   * for a label on that side — the widest and tallest labels set the margins —
   * and the name row underneath.
   */
  const widest = Math.max(...sizes.map((s) => s.width))
  const tallest = Math.max(...sizes.map((s) => s.height))
  const room = {
    x0: sky.x0 + widest / 2,
    x1: sky.x1 - widest / 2,
    y0: sky.y0 + tallest + LABEL_OFFSET,
    y1: sky.y1 - nameRow - tallest - LABEL_OFFSET,
  }
  const scale = Math.max(0, Math.min((room.x1 - room.x0) / 2, (room.y1 - room.y0) / 2))
  const cx = (room.x0 + room.x1) / 2
  const cy = (room.y0 + room.y1) / 2
  const points = figure.stars.map(([x, y]) => ({ x: cx + x * scale, y: cy - y * scale }))

  /*
   * The milestones go to the stars from left to right, so the timeline still
   * reads in order across the figure even though the figure's own lines do not
   * follow it.
   */
  const order = points.map((_, i) => i).sort((a, b) => points[a].x - points[b].x || points[a].y - points[b].y)
  const milestoneAt = []
  order.forEach((figureIndex, i) => { milestoneAt[figureIndex] = i })

  const starDiscs = points.map((p) => ({ x0: p.x - STAR_CLEARANCE, x1: p.x + STAR_CLEARANCE, y0: p.y - STAR_CLEARANCE, y1: p.y + STAR_CLEARANCE }))
  const nameBox = { x0: sky.x0, x1: sky.x1, y0: sky.y1 - nameRow, y1: sky.y1 }
  /*
   * Labels may use the free page around the sky, not only the sky itself —
   * everywhere but the bio, the window's chrome rows, and the name.
   */
  const bounds = layout.labelBounds

  /*
   * Each label takes a side — below, above, beside, or on a diagonal — clear of
   * every other label and every star, and inside the page it may use. A real
   * figure crowds its stars in ways a timeline's even spacing never did, so no
   * single side works for all of them.
   *
   * First pass: each in turn takes the best side given the ones already
   * placed. That is order-dependent — an early label can take the only room a
   * crowded later one had — so then each reconsiders its side against all the
   * others, round after round, until a round changes nothing.
   */
  const positions = order.map((figureIndex) => points[figureIndex])
  const cost = (i, box, boxes) => {
    const outside = box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1
    let clash = area(box, nameBox)
    boxes.forEach((b, j) => { if (j !== i && b) clash += area(box, b) })
    starDiscs.forEach((d, j) => { if (j !== order[i]) clash += area(box, d) })
    return clash + (outside ? 1e6 : 0)
  }
  const bestSide = (i, boxes) => {
    let best = null
    for (const side of LABEL_SIDES) {
      const box = labelBox(positions[i].x, positions[i].y, side, sizes[i])
      const c = cost(i, box, boxes)
      if (!best || c < best.cost) best = { side, box, cost: c }
      if (c === 0) break
    }
    return best
  }

  const sides = []
  const placed = []
  shown.forEach((_, i) => {
    const best = bestSide(i, placed)
    sides[i] = best.side
    placed[i] = best.box
  })
  for (let round = 0; round < 8; round++) {
    let changed = false
    shown.forEach((_, i) => {
      const current = cost(i, placed[i], placed)
      if (current === 0) return
      const best = bestSide(i, placed)
      if (best.cost < current) {
        sides[i] = best.side
        placed[i] = best.box
        changed = true
      }
    })
    if (!changed) break
  }

  const stars = shown.map((m, i) => ({ id: m.id, x: positions[i].x, y: positions[i].y, label: sides[i] }))

  const edges = figure.edges.map(([a, b]) => [milestoneAt[a], milestoneAt[b]])
  const name = { text: figure.name, kind: figure.kind, x: (sky.x0 + sky.x1) / 2, y: sky.y1 - nameRow / 2 }

  const rand = seeded(1337)
  const ambient = []
  for (let tries = 0; ambient.length < AMBIENT_COUNT[kind] && tries < 2000; tries++) {
    const x = sky.x0 + rand() * (sky.x1 - sky.x0)
    const y = sky.y0 + rand() * (sky.y1 - sky.y0)
    const radius = 1 + rand() * 1.2
    const alpha = 0.25 + rand() * 0.35
    // Never under the words — a label or the figure's name — nor crowding a star.
    if (inside(x, y, nameBox)) continue
    if (placed.some((b) => inside(x, y, b, AMBIENT_CLEARANCE / 2))) continue
    if (stars.some((s) => Math.hypot(s.x - x, s.y - y) < AMBIENT_CLEARANCE)) continue
    ambient.push({ x, y, radius, alpha })
  }

  return { figure, compact, stars, edges, labelBoxes: placed, name, nameBox, ambient, panel: panelRect(layout.panel) }
}

export { overlap }
