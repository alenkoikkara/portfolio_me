import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from './useStoryStore'
import { bridgeDeviceToStory } from './bridge'
import { chapterForMode, chapterFromPath, homeCaption, CHAPTERS, songFromQuery, songLink, songChords } from './chapters'
import { sky, HOME_HOUR } from './sky'

let unsubscribe
const device = () => useDeviceStore.getState()
const chapter = () => useStoryStore.getState().chapter

beforeEach(() => {
  sky.hours = HOME_HOUR
  useDeviceStore.setState({ mode: 'IDLE', focusedPhotoId: null, pendingHome: false, pendingIndex: null })
  useStoryStore.setState({ chapter: 'home', started: true, visited: [] })
  unsubscribe = bridgeDeviceToStory()
})
afterEach(() => unsubscribe())

describe('the bridge from the device to the story', () => {
  it('turns each section into its chapter, and rest into home', () => {
    device().openCarousel()
    expect(chapter()).toBe('projects')
    device().closeCarousel()
    expect(chapter()).toBe('home')
    device().openGallery()
    expect(chapter()).toBe('photography')
    device().galleryOpened()
    device().closeGallery()
    // Still on screen while it closes: the story waits for rest.
    expect(chapter()).toBe('photography')
    device().galleryClosed()
    expect(chapter()).toBe('home')
    device().openAbout()
    expect(chapter()).toBe('about')
    device().aboutOpened(); device().closeAbout(); device().aboutClosed()
    device().openContact()
    expect(chapter()).toBe('contact')
    device().closeContact()
    expect(chapter()).toBe('home')
  })

  it('stays in the projects chapter through a whole projection', () => {
    device().openCarousel()
    device().insert(0)
    device().seated()
    device().eject()
    device().ejected()
    expect(chapter()).toBe('projects')
    expect(useStoryStore.getState().visited).toEqual(['projects'])
  })

  it('does nothing before the story has started', () => {
    useStoryStore.setState({ started: false })
    device().openCarousel()
    expect(chapter()).toBe('home')
  })
})

describe('songs', () => {
  it('reads a shared song only when it is four different sections', () => {
    expect(songFromQuery('?song=fpac')).toEqual(['photography', 'projects', 'about', 'contact'])
    expect(songFromQuery('?song=ffac')).toBeNull()
    expect(songFromQuery('?song=fpa')).toBeNull()
    expect(songFromQuery('?song=fpax')).toBeNull()
    expect(songFromQuery('?song=<script>')).toBeNull()
    expect(songFromQuery('')).toBeNull()
  })

  it('writes the link that replays a visit, and the chords it plays', () => {
    const visit = ['about', 'projects', 'contact', 'photography']
    expect(songLink('https://example.com', visit)).toBe('https://example.com/?song=apcf')
    expect(songFromQuery('?song=apcf')).toEqual(visit)
    expect(songChords(visit)).toEqual([CHAPTERS.about.chord, CHAPTERS.projects.chord, CHAPTERS.contact.chord, CHAPTERS.photography.chord])
  })
})

describe('chapter data', () => {
  it('reads modes and paths as chapters', () => {
    expect(chapterForMode('CLOSING_ABOUT')).toBeUndefined()
    expect(chapterForMode('PROJECTING')).toBe('projects')
    expect(chapterFromPath('/about')).toBe('about')
    expect(chapterFromPath('/nowhere')).toBeUndefined()
  })

  it('gives home a caption for every part of the day, on any day', () => {
    const seen = new Set([6, 13, 18, 23, 2, 30].map(homeCaption))
    expect(seen.size).toBe(4)
    expect(homeCaption(30)).toBe(homeCaption(6))
  })

  it('keeps every caption to one short line', () => {
    for (const c of Object.values(CHAPTERS)) expect(c.caption.length).toBeLessThan(60)
  })
})
