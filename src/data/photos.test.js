import { describe, it, expect } from 'vitest'
import { PHOTOS } from './photos'
import { GENERATED_PHOTOS } from './photos.generated'

describe('the photo catalogue', () => {
  it('carries every photo the build script produced', () => {
    expect(PHOTOS).toHaveLength(GENERATED_PHOTOS.length)
    expect(PHOTOS.map((p) => p.id)).toEqual(GENERATED_PHOTOS.map((p) => p.id))
  })

  it('gives every photo both sizes and a measured aspect', () => {
    for (const photo of PHOTOS) {
      expect(photo.id).toBeTruthy()
      expect(photo.thumb).toMatch(/^\/photos\/thumb\/.+\.webp$/)
      expect(photo.src).toMatch(/^\/photos\/full\/.+\.webp$/)
      expect(photo.aspect).toBeGreaterThan(0)
      expect(Number.isFinite(photo.aspect)).toBe(true)
    }
  })

  it('names each file after its id, which is how captions are keyed', () => {
    for (const photo of PHOTOS) {
      expect(photo.thumb).toBe(`/photos/thumb/${photo.id}.webp`)
      expect(photo.src).toBe(`/photos/full/${photo.id}.webp`)
    }
  })

  it('has no duplicate ids, which the layout hashes for position', () => {
    expect(new Set(PHOTOS.map((p) => p.id)).size).toBe(PHOTOS.length)
  })

  it('keeps aspect ratios inside what the wall can lay out', () => {
    // A print is a fixed width, so a wild aspect would make a column absurd.
    for (const photo of PHOTOS) {
      expect(photo.aspect).toBeGreaterThan(0.1)
      expect(photo.aspect).toBeLessThan(10)
    }
  })

  it('leaves the generated entries untouched by the merge', () => {
    for (const generated of GENERATED_PHOTOS) {
      const merged = PHOTOS.find((p) => p.id === generated.id)
      expect(merged.src).toBe(generated.src)
      expect(merged.thumb).toBe(generated.thumb)
      expect(merged.aspect).toBe(generated.aspect)
    }
  })

  it('treats captions as optional rather than defaulting to the filename', () => {
    for (const photo of PHOTOS) {
      if ('caption' in photo) expect(typeof photo.caption).toBe('string')
      expect(photo.caption).not.toBe(photo.id)
    }
  })
})
