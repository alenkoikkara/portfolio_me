import { describe, it, expect } from 'vitest'
import {
  aboutLayout,
  stackedSkyHeight,
  cameraSpaceAt,
  distanceFactorAt,
  pixelAt,
  PANEL_WIDTH,
  GLASS_DEPTH,
  CONTENT_DEPTH,
  GLASS_ORDER,
  CONTENT_ORDER,
} from './aboutLayout'
import { tanHalfVertical } from './cameraFov'

/** Where a camera-space point lands on screen, in CSS px. */
function project([x, y, z], w, h) {
  const depth = -z
  const tanV = tanHalfVertical(w / h)
  return [
    (x / (depth * tanV * (w / h)) + 1) / 2 * w,
    (1 - y / (depth * tanV)) / 2 * h,
  ]
}

/** The windows the view has to survive. */
const WINDOWS = {
  laptop: [1440, 900],
  'small laptop': [1280, 800],
  desktop: [1920, 1080],
  ultrawide: [2560, 1080],
  'tablet landscape': [1024, 768],
  'small window': [800, 600],
  phone: [390, 844],
  'small phone': [375, 667],
  'tablet portrait': [768, 1024],
}

const bioRect = ({ panel }) => (panel.anchor === 'side'
  ? { x0: panel.x, x1: panel.x + panel.width, y0: panel.y - panel.maxHeight / 2, y1: panel.y + panel.maxHeight / 2 }
  : { x0: panel.x - panel.width / 2, x1: panel.x + panel.width / 2, y0: panel.y, y1: panel.y + panel.maxHeight })
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

describe('the composition', () => {
  it('puts the constellation beside the bio on wide windows and above it on narrow ones', () => {
    for (const name of ['laptop', 'small laptop', 'desktop', 'ultrawide']) {
      expect(aboutLayout(...WINDOWS[name], 6).layout, name).toBe('side')
    }
    // 1024 px wide would leave the constellation too little room beside the bio.
    for (const name of ['tablet landscape', 'small window', 'phone', 'small phone', 'tablet portrait']) {
      expect(aboutLayout(...WINDOWS[name], 6).layout, name).toBe('stacked')
    }
  })

  for (const [name, [w, h]] of Object.entries(WINDOWS)) {
    it(`keeps the constellation and the bio apart, and on screen, on ${name}`, () => {
      const layout = aboutLayout(w, h, 6)
      const bio = bioRect(layout)
      expect(overlap(layout.sky, bio)).toBe(false)
      for (const r of [layout.sky, bio]) {
        expect(r.x0).toBeGreaterThanOrEqual(0)
        expect(r.x1).toBeLessThanOrEqual(w)
        expect(r.y0).toBeGreaterThanOrEqual(0)
        expect(r.y1).toBeLessThanOrEqual(h)
      }
    })
  }

  it('sets the constellation to the left of the bio, side by side', () => {
    for (const name of ['laptop', 'desktop', 'small laptop']) {
      const layout = aboutLayout(...WINDOWS[name], 6)
      expect(layout.sky.x1, name).toBeLessThan(layout.panel.x)
    }
  })

  it('leaves a side-by-side constellation room for six labelled stars', () => {
    for (const name of ['laptop', 'small laptop', 'desktop', 'ultrawide']) {
      const { sky } = aboutLayout(...WINDOWS[name], 6)
      expect(sky.x1 - sky.x0, name).toBeGreaterThanOrEqual(500)
    }
  })

  it('keeps the two columns together on a big screen rather than at its far edges', () => {
    const [w] = WINDOWS.ultrawide
    const { sky, panel } = aboutLayout(...WINDOWS.ultrawide, 6)
    expect(sky.x0).toBeGreaterThan(w * 0.2)
    expect(panel.x + panel.width).toBeLessThan(w * 0.8)
  })

  it('gives a narrow window a taller band for a bigger figure', () => {
    expect(stackedSkyHeight(10)).toBeGreaterThan(stackedSkyHeight(3))
    const [w, h] = WINDOWS.phone
    const small = aboutLayout(w, h, 3)
    const big = aboutLayout(w, h, 10)
    expect(big.sky.y1 - big.sky.y0).toBe(stackedSkyHeight(10))
    // The bio moves down with it, and keeps clear of it.
    expect(big.panel.y).toBeGreaterThan(small.panel.y)
    expect(big.panel.y).toBeGreaterThan(big.sky.y1)
  })

  it('narrows the bio only where the window cannot fit it whole', () => {
    expect(aboutLayout(...WINDOWS.laptop, 6).panel.width).toBe(PANEL_WIDTH)
    expect(aboutLayout(...WINDOWS.phone, 6).panel.width).toBe(PANEL_WIDTH)
    expect(aboutLayout(320, 640, 6).panel.width).toBe(320 - 48)
  })
})

describe('placing things in front of the camera', () => {
  it('puts a screen pixel back on the same pixel, at any depth', () => {
    const [w, h] = WINDOWS.laptop
    for (const depth of [0.1, CONTENT_DEPTH, 1]) {
      const [x, y] = project(cameraSpaceAt(300, 700, depth, w, h), w, h)
      expect(x).toBeCloseTo(300, 6)
      expect(y).toBeCloseTo(700, 6)
    }
  })

  it('places the bio at its anchor and the content plane at the top-left pixel', () => {
    const [w, h] = WINDOWS.laptop
    const layout = aboutLayout(w, h, 6)
    const [x, y] = project(layout.panel.position, w, h)
    expect(x).toBeCloseTo(layout.panel.x, 6)
    expect(y).toBeCloseTo(layout.panel.y, 6)
    const [ox, oy] = project(layout.content.origin, w, h)
    expect(ox).toBeCloseTo(0, 6)
    expect(oy).toBeCloseTo(0, 6)
  })

  it('stands the glass between the camera and the device, and the content in front of it', () => {
    // The device is about half a metre from the camera at rest.
    expect(GLASS_DEPTH).toBeLessThan(0.45)
    expect(CONTENT_DEPTH).toBeLessThan(GLASS_DEPTH)
    expect(CONTENT_ORDER).toBeGreaterThan(GLASS_ORDER)
  })

  it('draws the glass on a plane that fills the frame, with the pane inset inside it', () => {
    for (const [w, h] of Object.values(WINDOWS)) {
      const { glass } = aboutLayout(w, h, 6)
      const frameHeight = 2 * GLASS_DEPTH * tanHalfVertical(w / h)
      expect(glass.frameHeight).toBeCloseTo(frameHeight, 12)
      expect(glass.frameWidth).toBeCloseTo(frameHeight * (w / h), 12)
      // The pane's edge has to be on screen to bend anything, and its corners
      // and bevel have to fit inside it.
      expect(glass.inset).toBeGreaterThan(0)
      expect(glass.radius * 2).toBeLessThan(Math.min(w, h) - 2 * glass.inset)
      expect(glass.bevel).toBeLessThanOrEqual(glass.radius)
    }
  })

  it('draws one CSS pixel as one screen pixel', () => {
    // drei draws a CSS pixel as distanceFactor / 400 world units.
    for (const [w, h] of Object.values(WINDOWS)) {
      const layout = aboutLayout(w, h, 6)
      expect(layout.panel.distanceFactor / 400).toBeCloseTo(pixelAt(CONTENT_DEPTH, w, h), 12)
      expect(layout.content.distanceFactor / 400).toBeCloseTo(layout.content.pixel, 12)
    }
    expect(distanceFactorAt(1, 400, 300)).toBeCloseTo((400 * 2 * tanHalfVertical(400 / 300)) / 300, 12)
  })

  it('survives a zero-sized canvas during layout', () => {
    const layout = aboutLayout(0, 0, 6)
    expect(layout.panel.position.every(Number.isFinite)).toBe(true)
    expect(layout.content.origin.every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(layout.content.distanceFactor)).toBe(true)
  })
})
