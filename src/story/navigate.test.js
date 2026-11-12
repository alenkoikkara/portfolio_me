import { describe, it, expect, beforeEach } from 'vitest'
import useDeviceStore from '../scene/useDeviceStore'
import { openChapter, goHomeChapter, beginDay, skipSunrise, startFromAddress, canOpenChapter } from './navigate'
import useStoryStore from './useStoryStore'
import { sky, PROLOGUE_HOUR } from './sky'

const device = () => useDeviceStore.getState()
const mode = () => device().mode

beforeEach(() => {
  window.localStorage.clear()
  sky.hours = PROLOGUE_HOUR
  useDeviceStore.setState({ mode: 'IDLE', focusedPhotoId: null, pendingHome: false, pendingIndex: null, curtainUp: false, introSkipped: false })
  useStoryStore.setState({ chapter: 'prologue', started: false, visited: [], travelMs: 0 })
})

describe('opening a chapter from anywhere', () => {
  it('opens straight away from rest, through the device’s own action', () => {
    openChapter('projects')
    expect(mode()).toBe('BROWSING')
  })

  it('goes home first from another section, then opens on arrival', () => {
    openChapter('about')
    device().aboutOpened()
    openChapter('photography')
    expect(mode()).toBe('CLOSING_ABOUT')
    device().aboutClosed()
    expect(mode()).toBe('OPENING_GALLERY')
  })

  it('lets a later request replace one still waiting', () => {
    openChapter('about')
    device().aboutOpened()
    openChapter('photography')
    openChapter('projects')
    device().aboutClosed()
    expect(mode()).toBe('BROWSING')
  })

  it('does nothing for the chapter already open, or one that is not a chapter', () => {
    openChapter('projects')
    openChapter('projects')
    expect(mode()).toBe('BROWSING')
    device().closeCarousel()
    openChapter('nowhere')
    expect(mode()).toBe('IDLE')
  })

  it('opens contact like any other section', () => {
    openChapter('contact')
    expect(mode()).toBe('CONTACT')
  })

  it('cancels a waiting open when the visitor heads home instead', () => {
    openChapter('about')
    device().aboutOpened()
    openChapter('photography')
    goHomeChapter()
    device().aboutClosed()
    expect(mode()).toBe('IDLE')
  })
})

describe('beginning the day', () => {
  it('raises the curtain on Begin and lets a first visitor see the intro', () => {
    beginDay()
    expect(useStoryStore.getState().started).toBe(true)
    expect(device().curtainUp).toBe(true)
    expect(device().introSkipped).toBe(false)
  })

  it('starts a returning visitor with the device assembled', () => {
    window.localStorage.setItem('hichord:seen', '1')
    beginDay()
    expect(device().introSkipped).toBe(true)
  })

  it('does nothing a second time', () => {
    beginDay()
    useDeviceStore.setState({ curtainUp: false })
    beginDay()
    expect(device().curtainUp).toBe(false)
  })

  it('skips the sunrise and the intro together', () => {
    beginDay()
    skipSunrise()
    expect(useStoryStore.getState().travelMs).toBe(0)
    expect(device().introSkipped).toBe(true)
  })
})

describe('deep links', () => {
  it('goes straight into a chapter, past the Prologue and the intro', () => {
    expect(startFromAddress('/about')).toBe(true)
    expect(useStoryStore.getState()).toMatchObject({ started: true, chapter: 'about' })
    expect(device()).toMatchObject({ mode: 'OPENING_ABOUT', curtainUp: true, introSkipped: true })
  })

  it('leaves home and unknown addresses to the Prologue', () => {
    expect(startFromAddress('/')).toBe(false)
    expect(startFromAddress('/nowhere')).toBe(false)
    expect(canOpenChapter('nowhere')).toBe(false)
    expect(useStoryStore.getState().started).toBe(false)
  })

  it('deep-links into contact too', () => {
    expect(startFromAddress('/contact')).toBe(true)
    expect(device().mode).toBe('CONTACT')
  })
})
