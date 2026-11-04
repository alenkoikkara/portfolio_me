/**
 * The day's chapters: each section of the site is an hour. Pure data — the
 * copy is a first draft for Alen to rewrite; keep every caption to one line.
 *
 * Contact's chord is held rather than played (`hold`): a question left in the
 * air until the visitor reaches out, when it resolves home.
 */

import { CHORDS } from './chords'

export { PROLOGUE_HOUR, HOME_HOUR } from './sky'

export const CHAPTERS = {
  projects: { path: '/projects', hour: 12 + 40 / 60, title: 'Projects', caption: 'Midday. The part where things get built.', chord: CHORDS.projects },
  photography: { path: '/photography', hour: 18 + 55 / 60, title: 'Photography', caption: 'Golden hour. I stop working and start looking.', chord: CHORDS.photography },
  about: { path: '/about', hour: 23 + 30 / 60, title: 'About', caption: 'Late. A good time to think about how I got here.', chord: CHORDS.about },
  contact: { path: '/contact', hour: 6 + 5 / 60, title: 'Contact', caption: 'A new day. Say hello.', chord: CHORDS.contactSus, hold: true },
}

export const SECTION_CHAPTERS = Object.keys(CHAPTERS)

export const PROLOGUE_CAPTION = 'Chicago, before the city wakes.'
export const CONTACT_RESOLVED_CAPTION = 'See you tomorrow.'

/** Home's caption is whatever the hour makes it. */
export function homeCaption(hours) {
  const h = ((hours % 24) + 24) % 24
  if (h >= 5 && h < 11) return 'Coffee first. Then everything else.'
  if (h >= 11 && h < 17) return 'Somewhere between meetings.'
  if (h >= 17 && h < 21) return "The light's good right now."
  return "City's quiet. Still building."
}

/** The chapter whose page lives at `path`, if any. */
export function chapterFromPath(path) {
  return SECTION_CHAPTERS.find((c) => CHAPTERS[c].path === path)
}

/**
 * The device's modes, read as chapters. The closing modes are deliberately
 * absent: a section is still on screen while it closes, and the story waits for
 * rest before it calls the visitor home.
 */
const MODE_TO_CHAPTER = {
  IDLE: 'home',
  BROWSING: 'projects',
  INSERTING: 'projects',
  PROJECTING: 'projects',
  EJECTING: 'projects',
  OPENING_GALLERY: 'photography',
  GALLERY: 'photography',
  OPENING_ABOUT: 'about',
  ABOUT: 'about',
  CONTACT: 'contact',
}

/** The device key each section is opened by: the song presses them as it plays. */
export const SECTION_KEYS = {
  projects: 'Key_Top_0',
  about: 'Key_Top_1',
  photography: 'Key_Top_2',
  contact: 'Key_Bot_3',
}

/** A visit's chords, in order: each chapter's own — Contact's the held one, as it sounded. */
export function songChords(chapters) {
  return chapters.map((c) => CHAPTERS[c].chord)
}

/** Each section's letter in a shared song link (`?song=pfac`). */
export const SONG_CODE = { projects: 'p', photography: 'f', about: 'a', contact: 'c' }

/**
 * A song from a shared link: four different sections, in the order someone
 * visited them, or null for anything else — a link is only ever data.
 */
export function songFromQuery(search) {
  const code = new URLSearchParams(search).get('song')
  if (!code || code.length !== 4) return null
  const byLetter = Object.fromEntries(Object.entries(SONG_CODE).map(([chapter, letter]) => [letter, chapter]))
  const chapters = [...code].map((letter) => byLetter[letter])
  if (chapters.some((c) => !c) || new Set(chapters).size !== 4) return null
  return chapters
}

/** The link that replays a visit. */
export function songLink(origin, visited) {
  return `${origin}/?song=${visited.map((c) => SONG_CODE[c]).join('')}`
}

export function chapterForMode(mode) {
  return MODE_TO_CHAPTER[mode]
}
