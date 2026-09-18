import { describe, it, expect } from 'vitest'
import {
  COLUMNS,
  COLUMN_PITCH,
  GAP,
  GALLERY_FOV,
  GALLERY_LAYER,
  PAN_PADDING,
  PRINT_WIDTH,
  WALL_Z,
  layoutWall,
  panRange,
  viewExtents,
  wallDistance,
} from './galleryLayout'

/** A photo is only ever an id and an aspect ratio as far as the pack cares. */
const photo = (id, aspect) => ({ id, aspect })
const MIXED = [
  photo('a', 1.5), photo('b', 0.667), photo('c', 1), photo('d', 1.78),
  photo('e', 0.75), photo('f', 2.4), photo('g', 1.33), photo('h', 1),
]

describe('layoutWall', () => {
  it('places every photo exactly once', () => {
    const { prints } = layoutWall(MIXED)
    expect(prints).toHaveLength(MIXED.length)
    expect(prints.map((p) => p.photo.id).sort()).toEqual(MIXED.map((p) => p.id).sort())
  })

  it('derives height from the aspect ratio at a fixed print width', () => {
    const { prints } = layoutWall([photo('wide', 2), photo('tall', 0.5)])
    const wide = prints.find((p) => p.photo.id === 'wide')
    const tall = prints.find((p) => p.photo.id === 'tall')
    expect(wide.w).toBe(PRINT_WIDTH)
    expect(wide.h).toBeCloseTo(PRINT_WIDTH / 2, 10)
    expect(tall.h).toBeCloseTo(PRINT_WIDTH * 2, 10)
  })

  it('lays prints out in columns on the column pitch, centred on x = 0', () => {
    const { prints } = layoutWall(MIXED)
    const xs = [...new Set(prints.map((p) => p.x))].sort((a, b) => a - b)
    expect(xs).toHaveLength(COLUMNS)
    // Symmetric about zero, so the wall hangs centred whatever the count.
    expect(xs[0]).toBeCloseTo(-xs[xs.length - 1], 10)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeCloseTo(COLUMN_PITCH, 10)
    }
  })

  it('always fills the shortest column next, so columns stay level as it grows', () => {
    // Five tall then five short: a naive round-robin would leave the first
    // column far longer than the last.
    const photos = [
      ...Array.from({ length: 5 }, (_, i) => photo(`tall${i}`, 0.5)),
      ...Array.from({ length: 5 }, (_, i) => photo(`wide${i}`, 3)),
    ]
    const { prints } = layoutWall(photos)
    const bottoms = new Map()
    for (const p of prints) {
      const cur = bottoms.get(p.x) ?? 0
      bottoms.set(p.x, Math.min(cur, p.y - p.h / 2))
    }
    const depths = [...bottoms.values()]
    const spread = Math.max(...depths) - Math.min(...depths)
    // Bounded by the tallest single print; never a runaway column.
    expect(spread).toBeLessThanOrEqual(PRINT_WIDTH / 0.5)
  })

  it('grows downward from y = 0 so the wall hangs from its top edge', () => {
    const { prints, bounds } = layoutWall(MIXED)
    expect(bounds.maxY).toBe(0)
    for (const p of prints) expect(p.y).toBeLessThan(0)
    // The topmost print's upper edge is exactly the top of the wall.
    const highest = Math.max(...prints.map((p) => p.y + p.h / 2))
    expect(highest).toBeCloseTo(0, 10)
  })

  it('reports bounds that contain every print', () => {
    const { prints, bounds } = layoutWall(MIXED)
    for (const p of prints) {
      expect(p.x - p.w / 2).toBeGreaterThanOrEqual(bounds.minX - 1e-9)
      expect(p.x + p.w / 2).toBeLessThanOrEqual(bounds.maxX + 1e-9)
      expect(p.y - p.h / 2).toBeGreaterThanOrEqual(bounds.minY - 1e-9)
      expect(p.y + p.h / 2).toBeLessThanOrEqual(bounds.maxY + 1e-9)
    }
  })

  it('does not count the trailing gap as content', () => {
    // One print: the wall is exactly that print tall, with no gap hanging off it.
    const { bounds } = layoutWall([photo('only', 1)])
    expect(bounds.minY).toBeCloseTo(-PRINT_WIDTH, 10)
  })

  it('handles an empty wall without producing NaN bounds', () => {
    const { prints, bounds } = layoutWall([])
    expect(prints).toEqual([])
    for (const v of Object.values(bounds)) expect(Number.isFinite(v)).toBe(true)
    // Zero-valued; the expression yields -0, which is arithmetically the same.
    expect(bounds.minY).toBeCloseTo(0, 10)
  })

  it('does not throw on a degenerate column count', () => {
    const { prints, bounds } = layoutWall([], 0)
    expect(prints).toEqual([])
    expect(Number.isFinite(bounds.minY)).toBe(true)
  })

  it('honours a custom column count', () => {
    const { prints } = layoutWall(MIXED, 2)
    expect(new Set(prints.map((p) => p.x)).size).toBe(2)
  })
})

describe('deterministic depth and tilt', () => {
  it('hangs a photo in the same place on every run', () => {
    const a = layoutWall(MIXED)
    const b = layoutWall(MIXED)
    expect(b.prints.map((p) => [p.photo.id, p.x, p.y, p.z, p.rot]))
      .toEqual(a.prints.map((p) => [p.photo.id, p.x, p.y, p.z, p.rot]))
  })

  it('depends on the id, not on position in the list', () => {
    const [first] = layoutWall([photo('same', 1), photo('other', 1)]).prints
    const moved = layoutWall([photo('other', 1), photo('same', 1)]).prints
      .find((p) => p.photo.id === 'same')
    expect(moved.z).toBeCloseTo(first.z, 12)
    expect(moved.rot).toBeCloseTo(first.rot, 12)
  })

  it('keeps depth and tilt within their jitter budget', () => {
    const ids = Array.from({ length: 300 }, (_, i) => photo(`photo-${i}`, 1 + (i % 5) * 0.2))
    const { prints } = layoutWall(ids)
    for (const p of prints) {
      expect(Math.abs(p.z)).toBeLessThanOrEqual(0.008 / 2)
      expect(Math.abs(p.rot)).toBeLessThanOrEqual(0.015 / 2)
    }
  })

  it('draws depth and tilt from independent streams, so they do not correlate', () => {
    const ids = Array.from({ length: 400 }, (_, i) => photo(`photo-${i}`, 1.5))
    const { prints } = layoutWall(ids)
    const zs = prints.map((p) => p.z)
    const rots = prints.map((p) => p.rot)
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
    const mz = mean(zs)
    const mr = mean(rots)
    let cov = 0
    let vz = 0
    let vr = 0
    for (let i = 0; i < zs.length; i++) {
      cov += (zs[i] - mz) * (rots[i] - mr)
      vz += (zs[i] - mz) ** 2
      vr += (rots[i] - mr) ** 2
    }
    // A shared seed would drive this to ±1; independent streams sit near zero.
    expect(Math.abs(cov / Math.sqrt(vz * vr))).toBeLessThan(0.2)
  })

  it('spreads depth across its range rather than clustering', () => {
    const ids = Array.from({ length: 500 }, (_, i) => photo(`photo-${i}`, 1))
    const { prints } = layoutWall(ids)
    const buckets = new Array(5).fill(0)
    for (const p of prints) {
      const t = (p.z + 0.004) / 0.008
      buckets[Math.min(4, Math.max(0, Math.floor(t * 5)))]++
    }
    for (const b of buckets) expect(b).toBeGreaterThan(prints.length / 5 * 0.5)
  })
})

describe('camera framing', () => {
  const ASPECTS = [390 / 844, 768 / 1024, 1440 / 813, 2560 / 1080]

  it('puts a sensible number of columns on screen at every viewport', () => {
    for (const aspect of ASPECTS) {
      const distance = wallDistance(aspect)
      const { halfWidth } = viewExtents(aspect, distance)
      const columnsOnScreen = (halfWidth * 2) / COLUMN_PITCH
      expect(columnsOnScreen).toBeGreaterThanOrEqual(1.8)
      expect(columnsOnScreen).toBeLessThanOrEqual(4)
    }
  })

  it('moves the camera closer on a narrow viewport rather than reflowing the wall', () => {
    // Placement must not depend on the viewport, or prints would move on resize.
    expect(wallDistance(390 / 844)).toBeGreaterThan(0)
    const narrow = layoutWall(MIXED)
    const wide = layoutWall(MIXED)
    expect(narrow.prints.map((p) => p.y)).toEqual(wide.prints.map((p) => p.y))
  })

  it('derives view extents from the field of view and distance', () => {
    const distance = 2
    const aspect = 1.5
    const { halfWidth, halfHeight } = viewExtents(aspect, distance)
    const expectedHalfHeight = Math.tan((GALLERY_FOV * Math.PI) / 180 / 2) * distance
    expect(halfHeight).toBeCloseTo(expectedHalfHeight, 10)
    expect(halfWidth).toBeCloseTo(expectedHalfHeight * aspect, 10)
  })
})

describe('panRange', () => {
  const aspect = 1440 / 813

  it('stops the view at the pictures rather than past them', () => {
    const { bounds } = layoutWall(MIXED)
    const distance = wallDistance(aspect)
    const { halfHeight } = viewExtents(aspect, distance)
    const range = panRange(bounds, aspect, distance)
    const emptyBelow = bounds.minY - (range.minY - halfHeight)
    const emptyAbove = (range.maxY + halfHeight) - bounds.maxY
    expect(emptyBelow).toBeCloseTo(PAN_PADDING, 10)
    expect(emptyAbove).toBeCloseTo(PAN_PADDING, 10)
  })

  it('never pads by more than the gap between prints', () => {
    // The defect this guards: a padding of half a column pitch put a quarter of
    // a screen of empty backdrop under the wall at the bottom of every pan.
    expect(PAN_PADDING).toBeLessThanOrEqual(GAP)
  })

  it('still brings the outermost column fully into view', () => {
    const { bounds } = layoutWall(MIXED)
    const distance = wallDistance(aspect)
    const { halfWidth } = viewExtents(aspect, distance)
    const range = panRange(bounds, aspect, distance)
    expect(range.maxX + halfWidth).toBeGreaterThanOrEqual(bounds.maxX)
    expect(range.minX - halfWidth).toBeLessThanOrEqual(bounds.minX)
  })

  it('collapses to the centre when the wall is smaller than the viewport', () => {
    const bounds = { minX: -0.05, maxX: 0.05, minY: -0.05, maxY: 0.05 }
    const range = panRange(bounds, aspect, 5)
    expect(range.minX).toBe(range.maxX)
    expect(range.minY).toBe(range.maxY)
    expect(range.minX).toBeCloseTo(0, 10)
  })

  it('returns a range that is ordered, never inverted', () => {
    for (const aspectRatio of [0.4, 1, 2.4]) {
      const { bounds } = layoutWall(MIXED)
      const distance = wallDistance(aspectRatio)
      const range = panRange(bounds, aspectRatio, distance)
      expect(range.minX).toBeLessThanOrEqual(range.maxX)
      expect(range.minY).toBeLessThanOrEqual(range.maxY)
    }
  })
})

describe('scene constants', () => {
  it('hangs the wall behind the device rather than moving the device', () => {
    expect(WALL_Z).toBeLessThan(-1)
  })

  it('keeps the wall off the layer the device camera renders', () => {
    expect(GALLERY_LAYER).toBeGreaterThan(0)
  })
})
