import { describe, it, expect, beforeEach, vi } from 'vitest'
import useStoryStore, { nextOccurrence, travelMsFor, SUNRISE_MS, QUICK_SUNRISE_MS } from './useStoryStore'
import { sky, HOME_HOUR, PROLOGUE_HOUR } from './sky'
import { CHAPTERS } from './chapters'

const get = () => useStoryStore.getState()

beforeEach(() => {
  sky.hours = HOME_HOUR
  useStoryStore.setState({ chapter: 'home', started: true, visited: [], fromTime: HOME_HOUR, toTime: HOME_HOUR, travelStart: 0, travelMs: 0 })
})

describe('the clock', () => {
  it('only ever moves forward', () => {
    expect(nextOccurrence(8, 12.5)).toBe(12.5)
    // From 23:30, 18:55 is tomorrow's.
    expect(nextOccurrence(23.5, 18.92)).toBeCloseTo(42.92, 6)
    // And from Day 2, the hour stays on Day 2 or later.
    expect(nextOccurrence(30, 6.08)).toBeCloseTo(30.08, 6)
    // Already there counts as there.
    expect(nextOccurrence(12.5, 12.5)).toBe(12.5)
  })

  it('takes longer over longer jumps, within bounds', () => {
    expect(travelMsFor(8, 12)).toBeLessThan(travelMsFor(8, 30))
    expect(travelMsFor(0, 100)).toBe(2600)
    expect(travelMsFor(8, 8)).toBe(1300)
  })

  it('cross-fades quickly when motion is reduced', () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduce') }))
    expect(travelMsFor(8, 30)).toBe(400)
    vi.unstubAllGlobals()
  })
})

describe('chapters', () => {
  it('spins forward to a section’s hour, from wherever the sky is', () => {
    get().goTo('about')
    expect(get().chapter).toBe('about')
    expect(get().fromTime).toBe(HOME_HOUR)
    expect(get().toTime).toBeCloseTo(CHAPTERS.about.hour, 6)
    expect(get().travelMs).toBeGreaterThan(0)
  })

  it('races through the night rather than rewinding, and the day ticks over', () => {
    get().goTo('about')
    sky.hours = get().toTime // the spin has landed at 23:30
    get().returnHome()
    get().goTo('photography')
    expect(get().toTime).toBeCloseTo(24 + CHAPTERS.photography.hour, 6)
  })

  it('carries on from the light on screen when a spin is interrupted', () => {
    get().goTo('about')
    sky.hours = 15.2 // partway there
    get().returnHome()
    get().goTo('projects')
    expect(get().fromTime).toBe(15.2)
    // Midday has passed today, so it is tomorrow's.
    expect(get().toTime).toBeCloseTo(24 + CHAPTERS.projects.hour, 6)
  })

  it('remembers the chapters seen, in order, once each', () => {
    get().goTo('photography')
    get().returnHome()
    get().goTo('projects')
    get().returnHome()
    get().goTo('photography')
    expect(get().visited).toEqual(['photography', 'projects'])
  })

  it('holds the time when the visitor goes home', () => {
    get().goTo('photography')
    const before = { ...get() }
    get().returnHome()
    expect(get().chapter).toBe('home')
    expect(get().toTime).toBe(before.toTime)
    expect(get().travelStart).toBe(before.travelStart)
  })

  it('ignores the chapter it is already in, and anything that is not a chapter', () => {
    get().goTo('about')
    const start = get().travelStart
    get().goTo('about')
    expect(get().travelStart).toBe(start)
    get().goTo('nowhere')
    expect(get().chapter).toBe('about')
    get().returnHome()
    const state = get()
    get().returnHome()
    expect(get()).toBe(state)
  })
})

describe('the contact beat', () => {
  beforeEach(() => useStoryStore.setState({ contactResolved: false }))

  it('races through the night to 06:05 on Day 2', () => {
    get().goTo('about')
    sky.hours = get().toTime
    get().returnHome()
    get().goTo('contact')
    expect(get().toTime).toBeCloseTo(24 + CHAPTERS.contact.hour, 6)
  })

  it('resolves only from contact, and only once', () => {
    get().resolveContact()
    expect(get().contactResolved).toBe(false)
    get().goTo('contact')
    get().resolveContact()
    expect(get().contactResolved).toBe(true)
    const state = get()
    get().resolveContact()
    expect(get()).toBe(state)
  })

  it('asks again on each visit to contact', () => {
    get().goTo('contact')
    get().resolveContact()
    get().returnHome()
    get().goTo('projects')
    get().returnHome()
    get().goTo('contact')
    expect(get().contactResolved).toBe(false)
  })

  it('lets the visitor leave without reaching out', () => {
    get().goTo('contact')
    get().goTo('about')
    expect(get().chapter).toBe('about')
    get().returnHome()
    get().goTo('contact')
    get().returnHome()
    expect(get().chapter).toBe('home')
  })
})

describe('sound', () => {
  it('is off until asked for, and toggles', () => {
    useStoryStore.setState({ soundOn: false })
    get().toggleSound()
    expect(get().soundOn).toBe(true)
    get().toggleSound()
    expect(get().soundOn).toBe(false)
  })
})

describe('the beginning', () => {
  beforeEach(() => {
    window.localStorage.clear()
    sky.hours = PROLOGUE_HOUR
    useStoryStore.setState({ chapter: 'prologue', started: false, visited: [], travelMs: 0 })
  })

  it('brings the sun up from before dawn to 08:10, as long as the device takes to assemble', () => {
    const quick = get().begin()
    expect(quick).toBe(false)
    expect(get()).toMatchObject({ started: true, chapter: 'home', fromTime: PROLOGUE_HOUR, travelMs: SUNRISE_MS })
    expect(get().toTime).toBeCloseTo(HOME_HOUR, 6)
  })

  it('begins quietly when the browser would not allow sound yet', () => {
    useStoryStore.setState({ soundOn: false })
    get().begin()
    expect(get().soundOn).toBe(false)
  })

  it('begins with sound, on the sunrise chord, once the visitor has clicked', () => {
    useStoryStore.setState({ soundOn: false })
    const activation = Object.getOwnPropertyDescriptor(navigator, 'userActivation')
    Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } })
    try {
      get().begin()
      expect(get().soundOn).toBe(true)
    } finally {
      if (activation) Object.defineProperty(navigator, 'userActivation', activation)
      else delete navigator.userActivation
      get().setSound(false)
    }
  })

  it('gives a returning visitor the quick sunrise', () => {
    get().begin()
    useStoryStore.setState({ started: false, chapter: 'prologue' })
    sky.hours = PROLOGUE_HOUR
    expect(get().begin()).toBe(true)
    expect(get().travelMs).toBe(QUICK_SUNRISE_MS)
  })

  it('begins only once', () => {
    get().begin()
    const start = get().travelStart
    expect(get().begin()).toBe(false)
    expect(get().travelStart).toBe(start)
  })

  it('counts a visitor as new when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('private') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private') })
    expect(get().begin()).toBe(false)
    getItem.mockRestore()
    setItem.mockRestore()
  })

  it('lands a spin at once when asked', () => {
    get().begin()
    get().skipTravel()
    expect(get().travelMs).toBe(0)
    const state = get()
    get().skipTravel()
    expect(get()).toBe(state)
  })

  it('starts a deep link in its chapter, at its hour, with no spin', () => {
    get().startAt('photography')
    expect(get()).toMatchObject({ started: true, chapter: 'photography', visited: ['photography'], travelMs: 0 })
    expect(sky.hours).toBeCloseTo(CHAPTERS.photography.hour, 6)
    get().startAt('nowhere')
    expect(get().chapter).toBe('photography')
  })
})
