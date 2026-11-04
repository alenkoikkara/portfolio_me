import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { SKY_KEYS } from './skyKeys'
import { sampleSky, createSkySample, sunDirection } from './sampleSky'
import { INK, INK_MUTED } from './palette'

const sample = createSkySample()
const hex = (c) => `#${c.getHexString()}`

/** WCAG relative luminance and contrast ratio, of linear colours. */
const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
const contrast = (a, b) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
/** Perceived lightness, 0–100 — how far from white a colour reads. */
const lightness = (c) => {
  const y = luminance(c)
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y
}

/** Every ten minutes of a day. */
const DAY = Array.from({ length: 24 * 6 }, (_, i) => i / 6)

describe('the sky through a day', () => {
  it('lands exactly on each keyframe', () => {
    for (const k of SKY_KEYS) {
      sampleSky(k.h, sample)
      expect(hex(sample.bgTop)).toBe(k.bgTop)
      expect(hex(sample.bgBottom)).toBe(k.bgBottom)
      expect(hex(sample.shadow)).toBe(k.shadow)
      expect(sample.shadowA).toBeCloseTo(k.shadowA, 6)
      expect(sample.sunI).toBeCloseTo(k.sunI, 6)
      expect(sample.exposure).toBeCloseTo(k.exposure, 6)
      expect(sample.sunDir.distanceTo(sunDirection(k.sunElev, k.sunAzim))).toBeLessThan(1e-6)
    }
  })

  it('starts at midnight, in order', () => {
    expect(SKY_KEYS[0].h).toBe(0)
    for (let i = 1; i < SKY_KEYS.length; i++) expect(SKY_KEYS[i].h).toBeGreaterThan(SKY_KEYS[i - 1].h)
  })

  it('wraps through midnight without a jump', () => {
    const before = createSkySample()
    sampleSky(23.999, before)
    sampleSky(24, sample)
    expect(contrast(before.bgTop, sample.bgTop)).toBeLessThan(1.01)
    expect(Math.abs(before.sunI - sample.sunI)).toBeLessThan(1e-3)
  })

  it('reads the same hour on any day', () => {
    const day1 = createSkySample()
    sampleSky(18.92, day1)
    sampleSky(18.92 + 48, sample)
    expect(hex(sample.bgTop)).toBe(hex(day1.bgTop))
    sampleSky(-5.08, sample)
    expect(hex(sample.bgTop)).toBe(hex(day1.bgTop))
  })

  it('has no jumps anywhere in the day: one second apart, the sky barely moves', () => {
    const next = createSkySample()
    const SECOND = 1 / 3600
    for (const h of DAY) {
      sampleSky(h, sample)
      sampleSky(h + SECOND, next)
      expect(Math.abs(next.sunI - sample.sunI), `${h}`).toBeLessThan(1e-3)
      expect(sample.sunDir.angleTo(next.sunDir), `${h}`).toBeLessThan(1e-3)
      // Per channel, so the measure is the same on a night sky as a day one.
      const step = Math.max(...['r', 'g', 'b'].map((c) => Math.abs(sample.bgTop[c] - next.bgTop[c])))
      expect(step, `${h}`).toBeLessThan(1e-3)
    }
  })
})

describe('where the light comes from', () => {
  const camera = new THREE.Vector3(0.253, 0.4818, 0.253)
  // The rest camera's screen-right, on the ground: forward × up.
  const right = camera.clone().negate().cross(new THREE.Vector3(0, 1, 0)).setY(0).normalize()
  const away = camera.clone().negate().setY(0).normalize()

  it('puts 0° on the left of the screen, 90° behind the device and 180° on the right', () => {
    expect(sunDirection(0, 0).dot(right)).toBeCloseTo(-1, 6)
    expect(sunDirection(0, 90).dot(away)).toBeCloseTo(1, 6)
    expect(sunDirection(0, 180).dot(right)).toBeCloseTo(1, 6)
  })

  it('sends the morning shadow right and the evening shadow left', () => {
    sampleSky(8.17, sample)
    expect(sample.sunDir.dot(right)).toBeLessThan(0) // sun on the left, shadow falls right
    sampleSky(18.92, sample)
    expect(sample.sunDir.dot(right)).toBeGreaterThan(0)
  })
})

describe('a white page at every hour', () => {
  const ink = new THREE.Color(INK)
  const muted = new THREE.Color(INK_MUTED)
  const label = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
  const worst = (c) => Math.min(contrast(c, sample.bgTop), contrast(c, sample.bgBottom))

  it('never leaves near white, so the time is told by light and shadow, not by colour', () => {
    for (const h of DAY) {
      sampleSky(h, sample)
      expect(lightness(sample.bgTop), label(h)).toBeGreaterThan(93)
      expect(lightness(sample.bgBottom), label(h)).toBeGreaterThan(93)
    }
  })

  it('keeps the fixed ink readable at both ends of the sky, every ten minutes of the day', () => {
    for (const h of DAY) {
      sampleSky(h, sample)
      // WCAG AA for body text, against the worse end of the gradient.
      expect(worst(ink), label(h)).toBeGreaterThanOrEqual(4.5)
      expect(worst(muted), label(h)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps the shadow a soft stain, never a cutout', () => {
    for (const h of DAY) {
      sampleSky(h, sample)
      expect(sample.shadowA, label(h)).toBeLessThanOrEqual(0.25)
    }
  })

  it('shows the star chart only around midnight', () => {
    for (const h of [6.5, 8.17, 12.67, 16.5, 18.92, 20.25]) {
      sampleSky(h, sample)
      expect(sample.stars, label(h)).toBe(0)
    }
    sampleSky(23.5, sample)
    expect(sample.stars).toBe(1)
  })
})
