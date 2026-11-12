import { describe, it, expect } from 'vitest'
import { readExposure, formatShutter, formatAperture, formatSettings, formatExposure } from './exif'

const iphone = {
  Image: { Make: 'Apple', Model: 'iPhone 13' },
  Photo: { ISOSpeedRatings: 50, ExposureTime: 1 / 1536, FNumber: 1.6 },
}

describe('reading the settings', () => {
  it('takes camera, ISO, shutter and aperture from the EXIF', () => {
    expect(readExposure(iphone)).toEqual({ camera: 'Apple iPhone 13', iso: 50, exposure: 1 / 1536, aperture: 1.6 })
  })

  it('does not name the maker twice when the model already does', () => {
    const canon = { Image: { Make: 'Canon', Model: 'Canon EOS 700D' }, Photo: {} }
    expect(readExposure(canon).camera).toBe('Canon EOS 700D')
  })

  it('falls back to the maker alone, and trims padding', () => {
    expect(readExposure({ Image: { Make: ' FUJIFILM ' } }).camera).toBe('FUJIFILM')
    expect(readExposure({ Image: { Model: 'X100V  ' } }).camera).toBe('X100V')
  })

  it('reads ISO from either tag, and from a list', () => {
    expect(readExposure({ Photo: { PhotographicSensitivity: 400 } }).iso).toBe(400)
    expect(readExposure({ Photo: { ISOSpeedRatings: [800, 800] } }).iso).toBe(800)
  })

  it('drops values that are zero or not numbers', () => {
    const blank = { Image: { Make: 'Apple' }, Photo: { ISOSpeedRatings: 0, ExposureTime: NaN, FNumber: 'f/2' } }
    expect(readExposure(blank)).toEqual({ camera: 'Apple', iso: null, exposure: null, aperture: null })
  })

  it('treats an empty block, or none, as no settings at all', () => {
    expect(readExposure({ Image: {}, Photo: {} })).toBeNull()
    expect(readExposure(undefined)).toBeNull()
  })
})

describe('writing them out', () => {
  it('writes shutter as a fraction below a second and seconds above', () => {
    expect(formatShutter(1 / 250)).toBe('1/250s')
    expect(formatShutter(0.3)).toBe('1/3s')
    expect(formatShutter(2)).toBe('2s')
    expect(formatShutter(1.5)).toBe('1.5s')
  })

  it('writes aperture as an f-number without trailing zeros', () => {
    expect(formatAperture(1.6)).toBe('ƒ/1.6')
    expect(formatAperture(22)).toBe('ƒ/22')
    expect(formatAperture(2.8000001)).toBe('ƒ/2.8')
  })

  it('joins camera, aperture, shutter and ISO in that order', () => {
    expect(formatExposure(readExposure(iphone))).toBe('Apple iPhone 13 · ƒ/1.6 · 1/1536s · ISO 50')
  })

  it('writes the settings alone, without the camera', () => {
    expect(formatSettings(readExposure(iphone))).toBe('ƒ/1.6 · 1/1536s · ISO 50')
    expect(formatSettings(null)).toBe('')
  })

  it('leaves out whatever is missing', () => {
    expect(formatExposure({ camera: null, iso: 100, exposure: null, aperture: 4 })).toBe('ƒ/4 · ISO 100')
    expect(formatExposure(null)).toBe('')
  })
})

describe('the year a photo was taken', () => {
  it('reads the capture time, as a Date or as EXIF text', async () => {
    const { readYear } = await import('./exif')
    expect(readYear({ Photo: { DateTimeOriginal: new Date('2023-08-28T10:00:00Z') } })).toBe(2023)
    expect(readYear({ Image: { DateTime: '2024:01:30 18:02:11' } })).toBe(2024)
  })

  it('gives none when there is none to read', async () => {
    const { readYear } = await import('./exif')
    expect(readYear(null)).toBeNull()
    expect(readYear({ Photo: {} })).toBeNull()
    expect(readYear({ Image: { DateTime: 'garbage' } })).toBeNull()
  })
})
