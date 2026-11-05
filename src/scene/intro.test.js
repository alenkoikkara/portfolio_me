import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { landingTime, INTRO_SECONDS } from './intro'

const scale = (times, values) => new THREE.VectorKeyframeTrack('.scale', times, values)

describe('when a part of the device lands', () => {
  it('is the first moment it holds still at its final size, not the end of the clip', () => {
    const clip = new THREE.AnimationClip('Key', 10, [
      scale([0, 2, 3, 10], [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1, 1]),
    ])
    expect(landingTime(clip)).toBe(3)
  })

  it('waits for the slowest of a clip’s tracks', () => {
    const clip = new THREE.AnimationClip('Key', 10, [
      scale([0, 1, 10], [0, 0, 0, 1, 1, 1, 1, 1, 1]),
      scale([0, 4, 10], [0, 0, 0, 2, 2, 2, 2, 2, 2]),
    ])
    expect(landingTime(clip)).toBe(4)
  })

  it('counts a part within a hair of its end as landed', () => {
    const clip = new THREE.AnimationClip('Key', 10, [scale([0, 5, 10], [0, 0, 0, 0.995, 0.995, 0.995, 1, 1, 1])])
    expect(landingTime(clip)).toBe(5)
  })

  it('ignores a wobble that is tiny next to how far the part travelled, even near zero', () => {
    // A key dropping 30 mm onto a resting height of 7 mm, its compressed
    // keyframes jittering a hundredth of a millimetre to the end.
    const drop = new THREE.VectorKeyframeTrack('.position', [0, 2, 6, 10], [0, 0.037, 0, 0, 0.007, 0, 0, 0.00701, 0, 0, 0.007, 0])
    expect(landingTime(new THREE.AnimationClip('Key', 10, [drop]))).toBe(2)
  })

  it('fits the whole opening into a few seconds', () => {
    expect(INTRO_SECONDS).toBeLessThanOrEqual(3)
  })
})
