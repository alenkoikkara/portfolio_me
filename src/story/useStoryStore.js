import { create } from 'zustand'
import { sky, HOME_HOUR } from './sky'
import { CHAPTERS, songFromQuery } from './chapters'
import { INTRO_SECONDS } from '../scene/intro'
import { setSoundOn, soundAllowed, playChord, holdChord, releaseHeld } from '../scene/audio'
import { CHORDS } from './chords'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true

/** A time-travel the reduced-motion setting allows: a quick cross-fade instead of a spin. */
const REDUCED_TRAVEL_MS = 400
/** The shortest spin, and the longest: longer jumps take a little longer, up to a point. */
const BASE_TRAVEL_MS = 1300
const MS_PER_HOUR = 60
const MAX_TRAVEL_MS = 2600

/*
 * The first sunrise lasts as long as the device's intro, so the sun and the
 * device land on 08:10 together. A returning visitor gets the plan's quick
 * one, with the device already assembled.
 */
export const SUNRISE_MS = INTRO_SECONDS * 1000
export const QUICK_SUNRISE_MS = 1400
const SEEN_KEY = 'hichord:seen'

/** Whether this browser has begun before. Private modes throw; they count as new. */
function seenBefore() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Private mode: the next visit is simply a first one again.
  }
}

/** The next time the clock reads `hour`, never earlier than `now`: time only moves forward. */
export function nextOccurrence(now, hour) {
  let t = Math.floor(now / 24) * 24 + hour
  if (t < now - 1e-6) t += 24
  return t
}

/** How long a spin from `from` to `to` takes, in ms. */
export function travelMsFor(from, to) {
  if (prefersReducedMotion()) return REDUCED_TRAVEL_MS
  return Math.min(MAX_TRAVEL_MS, BASE_TRAVEL_MS + (to - from) * MS_PER_HOUR)
}

/**
 * The story: which chapter the visitor is in, and the clock's journey there.
 *
 * The device store stays the source of truth for what is on screen; this store
 * only listens to it (bridge.js) and turns each section into its hour. The
 * clock itself is not React state — `sky.hours` is — so a spin is stored as
 * where it set off from, where it is going and when, and SkyDriver.jsx moves
 * the sky along it frame by frame.
 *
 * Every spin sets off from wherever the sky is *now*, so one interrupted by
 * another carries on from the light on screen rather than snapping.
 */
const useStoryStore = create((set, get) => {
  const travel = (to, ms = travelMsFor(sky.hours, to)) => ({
    fromTime: sky.hours,
    toTime: to,
    travelStart: typeof performance !== 'undefined' ? performance.now() : 0,
    travelMs: ms,
  })

  return {
    // False until the day begins, as the greeting lifts: before dawn.
    started: false,
    chapter: 'prologue',
    fromTime: sky.hours,
    toTime: sky.hours,
    travelStart: 0,
    travelMs: 0,
    /** Chapters seen, in the order first seen. */
    visited: [],
    /** Off until the visitor asks for it: Begin with sound, or the toggle. */
    soundOn: false,
    /** Whether the visitor reached out from Contact, resolving its held chord. */
    contactResolved: false,
    /** A song someone shared (`?song=`), as the chapters in their order; read once, on load. */
    sharedSong: typeof window !== 'undefined' ? songFromQuery(window.location.search) : null,

    /**
     * The day begins, as the greeting lifts: the sun comes up, 05:40 to 08:10,
     * on a chord. Browsers start sound only after a click or a key, so the
     * chord sounds — and sound comes on for the visit — only if the visitor
     * has already given one while the greeting played; otherwise it begins
     * quietly and sound waits for the toggle or M. Returns whether
     * it is the quick sunrise — a returning visitor, or reduced motion — in
     * which case the device should start assembled rather than play its intro.
     */
    begin() {
      if (get().started) return false
      const quick = seenBefore() || prefersReducedMotion()
      markSeen()
      const to = nextOccurrence(sky.hours, HOME_HOUR)
      set({
        started: true,
        chapter: 'home',
        ...travel(to, prefersReducedMotion() ? REDUCED_TRAVEL_MS : quick ? QUICK_SUNRISE_MS : SUNRISE_MS),
      })
      if (soundAllowed()) get().setSound(true)
      playChord(CHORDS.sunrise, { duration: 4.5, velocity: 0.5 })
      return quick
    },

    /** A deep link: straight into a chapter at its hour, no sunrise and no spin. */
    startAt(chapter) {
      const cfg = CHAPTERS[chapter]
      if (!cfg) return
      sky.hours = cfg.hour
      set({
        started: true,
        chapter,
        visited: [chapter],
        fromTime: cfg.hour,
        toTime: cfg.hour,
        travelStart: typeof performance !== 'undefined' ? performance.now() : 0,
        travelMs: 0,
      })
    },

    /** Land the current spin now — a click during the sunrise. */
    skipTravel() {
      if (get().travelMs > 0) set({ travelMs: 0 })
    },

    /** Into a section: the clock spins forward to its hour. */
    goTo(chapter) {
      const s = get()
      const cfg = CHAPTERS[chapter]
      if (!cfg || s.chapter === chapter) return
      // Leaving Contact without reaching out: its question just fades.
      if (s.chapter === 'contact' && !s.contactResolved) releaseHeld()
      set({
        chapter,
        visited: s.visited.includes(chapter) ? s.visited : [...s.visited, chapter],
        contactResolved: chapter === 'contact' ? false : s.contactResolved,
        ...travel(nextOccurrence(sky.hours, cfg.hour)),
      })
      // Each chapter's chord, as the clock starts to spin — Contact's held, the
      // rest played. Silent with sound off.
      if (cfg.hold) holdChord(cfg.chord)
      else playChord(cfg.chord)
    },

    /** The visitor reached out from Contact: the held chord resolves home. */
    resolveContact() {
      const s = get()
      if (s.chapter !== 'contact' || s.contactResolved) return
      releaseHeld(CHORDS.resolve)
      set({ contactResolved: true })
    },

    /** Sound on or off. On must be called inside a click: browsers start audio only there. */
    setSound(on) {
      setSoundOn(on)
      set({ soundOn: on })
    },

    toggleSound() {
      get().setSound(!get().soundOn)
    },

    /** Back to the device. Time holds: the visitor stays in the light they were in. */
    returnHome() {
      const s = get()
      if (s.chapter === 'home') return
      if (s.chapter === 'contact' && !s.contactResolved) releaseHeld()
      set({ chapter: 'home' })
    },
  }
})

export default useStoryStore
