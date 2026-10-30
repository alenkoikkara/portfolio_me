import { describe, it, expect } from 'vitest'
import { aboutLayout } from './aboutLayout'
import { constellationLayout, figureFor, panelRect, overlap, MAX_MILESTONES, COMPACT_ABOVE } from './constellationLayout'
import { CONSTELLATIONS } from './about/constellations.generated'
import { MILESTONES } from './about/timeline'

const WINDOWS = [[1440, 900], [1280, 800], [1920, 1080], [2560, 1080], [1024, 768], [800, 600], [390, 844], [375, 667], [768, 1024], [430, 932]]

/*
 * Ten milestones' worth of copy: the real ones, then made-up ones of similar
 * length, so every figure from one star to ten is laid out with text that
 * looks like what will actually go in it.
 */
const TEN = [
  ...MILESTONES,
  { id: 'x7', year: '2025', title: 'Somewhere', subtitle: 'another chapter' },
  { id: 'x8', year: '2026', title: 'Next role', subtitle: 'to come' },
  { id: 'x9', year: '2027', title: 'Further', subtitle: 'later still' },
  { id: 'x10', year: '2028', title: 'Beyond', subtitle: 'and on' },
]

const laidOut = (w, h, n) => constellationLayout(aboutLayout(w, h, n), TEN.slice(0, n))

describe('the figures', () => {
  it('exist for every count from one star to ten', () => {
    expect(MAX_MILESTONES).toBe(10)
    for (let n = 1; n <= 10; n++) expect(CONSTELLATIONS[n].stars, `figure ${n}`).toHaveLength(n)
  })

  it('are real constellations, except the lone star, which is Polaris', () => {
    expect(CONSTELLATIONS[1]).toMatchObject({ name: 'Polaris', kind: 'star' })
    for (let n = 2; n <= 10; n++) expect(CONSTELLATIONS[n].kind).toBe('constellation')
    expect(CONSTELLATIONS[4].name).toBe('Crux')
    expect(CONSTELLATIONS[5].name).toBe('Cassiopeia')
  })

  it('join only stars they have, and join every star to the figure', () => {
    for (let n = 2; n <= 10; n++) {
      const { stars, edges } = CONSTELLATIONS[n]
      const touched = new Set()
      for (const [a, b] of edges) {
        expect(a).not.toBe(b)
        expect(stars[a]).toBeDefined()
        expect(stars[b]).toBeDefined()
        touched.add(a).add(b)
      }
      expect(touched.size, `figure ${n}`).toBe(n)
    }
  })

  it('are scaled so their longer axis spans −1 to +1, keeping their shape', () => {
    for (let n = 2; n <= 10; n++) {
      const xs = CONSTELLATIONS[n].stars.map((s) => s[0])
      const ys = CONSTELLATIONS[n].stars.map((s) => s[1])
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
      expect(span).toBeCloseTo(2, 3)
    }
  })

  it('cover the timeline as it stands', () => {
    // A timeline past ten has no figure to take; this is what says so.
    expect(MILESTONES.length).toBeGreaterThanOrEqual(1)
    expect(MILESTONES.length).toBeLessThanOrEqual(MAX_MILESTONES)
    expect(figureFor(MILESTONES.length).stars).toHaveLength(MILESTONES.length)
  })

  it('keep the last figure for a timeline that outgrows them, rather than failing', () => {
    expect(figureFor(14)).toBe(CONSTELLATIONS[10])
    expect(figureFor(0)).toBe(CONSTELLATIONS[1])
  })
})

describe('the milestones', () => {
  for (const [w, h] of WINDOWS) {
    it(`keep every label clear on ${w}×${h}, for every figure`, () => {
      for (let n = 1; n <= 10; n++) {
        const plan = laidOut(w, h, n)
        plan.labelBoxes.forEach((label, i) => {
          const where = `figure ${n}, label ${i}`
          expect(overlap(label, plan.panel), `${where} on the bio`).toBe(false)
          expect(overlap(label, plan.nameBox), `${where} on the name`).toBe(false)
          expect(label.x0, where).toBeGreaterThanOrEqual(0)
          expect(label.x1, where).toBeLessThanOrEqual(w)
          expect(label.y0, where).toBeGreaterThanOrEqual(0)
          expect(label.y1, where).toBeLessThanOrEqual(h)
          for (const other of plan.labelBoxes.slice(i + 1)) expect(overlap(label, other), `${where} on another`).toBe(false)
          plan.stars.forEach((s, j) => {
            if (j === i) return
            expect(overlap(label, { x0: s.x - 5, x1: s.x + 5, y0: s.y - 5, y1: s.y + 5 }), `${where} on star ${j}`).toBe(false)
          })
        })
      }
    })
  }

  it('take the figure the count calls for, with all its lines', () => {
    for (let n = 1; n <= 10; n++) {
      const plan = laidOut(1440, 900, n)
      expect(plan.figure).toBe(CONSTELLATIONS[n])
      expect(plan.stars).toHaveLength(n)
      expect(plan.edges).toHaveLength(CONSTELLATIONS[n].edges.length)
    }
  })

  it('go to the stars from left to right, so the timeline reads in order', () => {
    for (let n = 2; n <= 10; n++) {
      const { stars } = laidOut(1440, 900, n)
      for (let i = 1; i < stars.length; i++) expect(stars[i].x).toBeGreaterThanOrEqual(stars[i - 1].x)
    }
  })

  it('keep the figure\'s shape on screen', () => {
    // The distances between stars on screen are the figure's own, scaled.
    const plan = laidOut(1440, 900, 5)
    const figure = CONSTELLATIONS[5]
    const byFigure = [...figure.stars.keys()].sort((a, b) => figure.stars[a][0] - figure.stars[b][0])
    const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
    const f = (i, j) => Math.hypot(figure.stars[byFigure[i]][0] - figure.stars[byFigure[j]][0], figure.stars[byFigure[i]][1] - figure.stars[byFigure[j]][1])
    const scale = d(plan.stars[0], plan.stars[4]) / f(0, 4)
    expect(d(plan.stars[1], plan.stars[3]) / f(1, 3)).toBeCloseTo(scale, 6)
  })

  it('drop the subtitle in a crowded figure, and only then', () => {
    expect(laidOut(1440, 900, COMPACT_ABOVE).compact).toBe(false)
    expect(laidOut(1440, 900, COMPACT_ABOVE + 1).compact).toBe(true)
  })
})

describe('the name', () => {
  it('sits centred under the figure, and is the figure\'s', () => {
    for (const [w, h] of WINDOWS) {
      const layout = aboutLayout(w, h, 6)
      const plan = constellationLayout(layout, MILESTONES)
      expect(plan.name.text).toBe(CONSTELLATIONS[MILESTONES.length].name)
      expect(plan.name.x).toBeCloseTo((layout.sky.x0 + layout.sky.x1) / 2, 6)
      for (const s of plan.stars) expect(s.y).toBeLessThan(plan.nameBox.y0)
    }
  })
})

describe('the ambient stars', () => {
  it('stand in the same places on every visit', () => {
    expect(laidOut(1440, 900, 6).ambient).toEqual(laidOut(1440, 900, 6).ambient)
  })

  it('fill the sky — forty beside the bio, fewer in a phone\'s band', () => {
    expect(laidOut(1440, 900, 6).ambient).toHaveLength(40)
    expect(laidOut(390, 844, 6).ambient).toHaveLength(24)
  })

  for (const [w, h] of WINDOWS) {
    it(`keep to the sky and off the words on ${w}×${h}`, () => {
      const plan = laidOut(w, h, 6)
      const { sky } = aboutLayout(w, h, 6)
      for (const s of plan.ambient) {
        expect(s.x).toBeGreaterThanOrEqual(sky.x0)
        expect(s.x).toBeLessThanOrEqual(sky.x1)
        expect(s.y).toBeGreaterThanOrEqual(sky.y0)
        expect(s.y).toBeLessThanOrEqual(sky.y1)
        const at = { x0: s.x, x1: s.x, y0: s.y, y1: s.y }
        expect(overlap(at, plan.nameBox)).toBe(false)
        for (const label of plan.labelBoxes) expect(overlap(at, label)).toBe(false)
      }
    })
  }

  it('stay faint and small', () => {
    for (const s of laidOut(1440, 900, 6).ambient) {
      expect(s.alpha).toBeGreaterThanOrEqual(0.25)
      expect(s.alpha).toBeLessThanOrEqual(0.6)
      expect(s.radius).toBeLessThanOrEqual(2.2)
    }
  })
})

describe('the bio column', () => {
  it('is measured from its own anchor in both arrangements', () => {
    expect(panelRect({ anchor: 'side', x: 100, y: 300, width: 340, maxHeight: 400 }))
      .toEqual({ x0: 100, x1: 440, y0: 100, y1: 500 })
    expect(panelRect({ anchor: 'stacked', x: 200, y: 300, width: 340, maxHeight: 400 }))
      .toEqual({ x0: 30, x1: 370, y0: 300, y1: 700 })
  })
})
