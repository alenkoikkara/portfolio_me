import { describe, it, expect } from 'vitest'
import deviceFade from './deviceFade'

describe('deviceFade', () => {
  it('starts fully present, so nothing is invisible before a fade runs', () => {
    expect(deviceFade.value).toBe(1)
  })

  it('is one shared object, so the device and its shadows cannot disagree', async () => {
    const again = (await import('./deviceFade')).default
    expect(again).toBe(deviceFade)
    deviceFade.value = 0.42
    expect(again.value).toBe(0.42)
    deviceFade.value = 1
  })
})
