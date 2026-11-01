import { describe, it, expect } from 'vitest'
import { HFOV, tanHalfVertical, verticalFov } from './cameraFov'

const TAN_HALF_H = Math.tan((HFOV * Math.PI) / 360)

/** The device's size on screen, as a share of the window's height — 1/tan of half the vertical FOV, up to a constant. */
const heightShare = (aspect) => 1 / tanHalfVertical(aspect)

describe('the device camera field of view', () => {
  it('keeps the device the same share of the height on every desktop shape', () => {
    const reference = heightShare(16 / 9)
    for (const aspect of [1.25, 4 / 3, 1.6, 16 / 10, 1.9, 21 / 9, 32 / 9]) {
      expect(heightShare(aspect)).toBeCloseTo(reference, 12)
    }
  })

  it('frames a 16:9 window exactly as the authored horizontal FOV did', () => {
    expect(tanHalfVertical(16 / 9) * (16 / 9)).toBeCloseTo(TAN_HALF_H, 12)
  })

  it('locks the width on phones and portrait windows, as it always has', () => {
    for (const aspect of [390 / 844, 0.75, 1]) {
      expect(tanHalfVertical(aspect) * aspect).toBeCloseTo(TAN_HALF_H, 12)
    }
  })

  it('eases between the two rules rather than jumping', () => {
    let previous = heightShare(1)
    for (let aspect = 1.01; aspect <= 1.25; aspect += 0.01) {
      const share = heightShare(aspect)
      expect(share).toBeGreaterThanOrEqual(previous)
      expect(share - previous).toBeLessThan(0.05 * previous)
      previous = share
    }
  })

  it('gives three a vertical FOV in degrees, and survives a zero-sized canvas', () => {
    expect(verticalFov(16 / 9)).toBeCloseTo((2 * Math.atan(TAN_HALF_H / (16 / 9)) * 180) / Math.PI, 10)
    expect(Number.isFinite(verticalFov(0))).toBe(true)
  })
})
