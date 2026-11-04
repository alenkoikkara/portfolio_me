import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/*
 * A stand-in for Web Audio that only counts: how many contexts were made, and
 * how many oscillators started. What the sounds *sound* like is checked by
 * metering the real bus (see Verifying changes in CLAUDE.md); what is checked
 * here is the rule that matters most — off means no context at all.
 */
function fakeAudio() {
  const counts = { contexts: 0, oscillators: 0, suspended: 0 }
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} })
  const node = () => ({ connect() {}, gain: param(), frequency: param(), Q: param(), type: '' })
  class FakeContext {
    constructor() { counts.contexts++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {} }
    createGain() { return node() }
    createBiquadFilter() { return node() }
    createConvolver() { return node() }
    createBuffer(channels, frames) { return { getChannelData: () => new Float32Array(frames) } }
    createBufferSource() { return { ...node(), start() {}, stop() {} } }
    createOscillator() { counts.oscillators++; return { ...node(), start() {}, stop() {} } }
    resume() { this.state = 'running' }
    suspend() { counts.suspended++; this.state = 'suspended' }
  }
  return { counts, FakeContext }
}

let audio
let counts

beforeEach(async () => {
  vi.resetModules()
  const fake = fakeAudio()
  counts = fake.counts
  vi.stubGlobal('AudioContext', fake.FakeContext)
  audio = await import('./audio')
})
afterEach(() => vi.unstubAllGlobals())

describe('notes', () => {
  it('reads scientific pitch', () => {
    expect(audio.noteFrequency('A4')).toBeCloseTo(440, 6)
    expect(audio.noteFrequency('A3')).toBeCloseTo(220, 6)
    expect(audio.noteFrequency('C4')).toBeCloseTo(261.626, 2)
    expect(audio.noteFrequency('F#3')).toBeCloseTo(184.997, 2)
    expect(audio.noteFrequency('Bb2')).toBeCloseTo(audio.noteFrequency('A#2'), 9)
    expect(() => audio.noteFrequency('H2')).toThrow()
  })
})

describe('sound off', () => {
  it('is fully silent: nothing creates a context', () => {
    audio.playChord(['D2', 'F#3', 'A3'])
    audio.playNote('D5')
    audio.playMechanicalClick()
    audio.startProjector()
    expect(counts.contexts).toBe(0)
  })
})

describe('sound on', () => {
  it('makes one context, and strums one voice per note', () => {
    audio.setSoundOn(true)
    audio.playChord(['D2', 'F#3', 'A3', 'C#4', 'E4'])
    audio.playNote('E5')
    audio.setSoundOn(true)
    expect(counts.contexts).toBe(1)
    // Each pad voice is a body and a tine; the bell is one more.
    expect(counts.oscillators).toBe(5 * 2 + 1)
  })

  it('suspends the context when turned off again, so even a running reel stops', () => {
    audio.setSoundOn(true)
    audio.setSoundOn(false)
    expect(counts.suspended).toBe(1)
    audio.playChord(['D2'])
    expect(counts.oscillators).toBe(0)
  })
})

describe('the held chord and the song', () => {
  it('holds a chord until it is released, and can resolve it', () => {
    audio.setSoundOn(true)
    audio.holdChord(['A1', 'G3', 'B3', 'D4'])
    expect(counts.oscillators).toBe(4 * 2)
    audio.releaseHeld(['D2', 'F#3', 'A3', 'E4'])
    expect(counts.oscillators).toBe(4 * 2 + 4 * 2)
    // Released already: a second release has nothing to let go, and no chord to play.
    audio.releaseHeld()
    expect(counts.oscillators).toBe(16)
  })

  it('plays a song in time, pressing along, then resolves home; and can be cancelled', () => {
    vi.useFakeTimers()
    audio.setSoundOn(true)
    const steps = []
    audio.playSong([['D2'], ['B1'], ['G1'], ['A1']], { home: ['D2', 'A2'], onStep: (i) => steps.push(i) })
    vi.advanceTimersByTime(audio.SONG_STEP_MS * 2 + 1)
    expect(steps).toEqual([0, 1, 2])
    vi.advanceTimersByTime(audio.SONG_STEP_MS * 3)
    expect(steps).toEqual([0, 1, 2, 3])
    // Four one-note chords and the two-note home, two oscillators a voice.
    expect(counts.oscillators).toBe((4 + 2) * 2)
    const cancel = audio.playSong([['D2'], ['B1']], {})
    cancel()
    vi.advanceTimersByTime(audio.SONG_STEP_MS * 3)
    expect(counts.oscillators).toBe(12)
    vi.useRealTimers()
  })
})
