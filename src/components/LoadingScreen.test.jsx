import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import LoadingScreen, { GREETINGS, WORD_STEP, LIFT_MS, GREETED_KEY } from './LoadingScreen'
import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from '../story/useStoryStore'

/*
 * The static loader exactly as index.html paints it before any script runs —
 * read from the file, so the component is tested against the real markup.
 */
const BOOT = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  .match(/<div id="boot"[\s\S]*?<div class="boot__line"><span><\/span><\/div>\s*<\/div>/)[0]

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })
/*
 * A word at a time: each word's timer is set by an effect that only runs once
 * React has committed the last one, so one long jump would cover a single word.
 */
const words = (n) => { for (let i = 0; i < n; i++) advance(WORD_STEP) }
const boot = () => document.getElementById('boot')
const showing = () => boot()?.querySelector('[data-active]')
const lifting = () => boot()?.classList.contains('boot--lifting') ?? false

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  document.body.insertAdjacentHTML('afterbegin', BOOT)
  useDeviceStore.setState({ sceneReady: false, curtainUp: false })
  useStoryStore.setState({ chapter: 'prologue', started: false, soundOn: false })
})
afterEach(() => {
  boot()?.remove()
  vi.useRealTimers()
})

describe('the loading screen', () => {
  it('is painted by index.html itself, before any script: the name and a line', () => {
    expect(boot().getAttribute('role')).toBe('status')
    expect(boot().textContent).toContain('alen koikkara')
    expect(boot().querySelector('.boot__line')).toBeTruthy()
  })

  it('says hello in each language in turn, each tagged with its language', () => {
    render(<LoadingScreen />)
    advance(20) // the first word fades in from the second frame
    for (const { word, lang } of GREETINGS) {
      expect(showing().textContent).toBe(word)
      expect(showing().getAttribute('lang')).toBe(lang)
      words(1)
    }
  })

  it('leaves at the end of the word showing once the scene is ready — not after all four', () => {
    render(<LoadingScreen />)
    advance(20)
    advance(WORD_STEP / 2)
    act(() => useDeviceStore.setState({ sceneReady: true }))
    // Mid-word: it finishes the word first.
    expect(lifting()).toBe(false)
    advance(WORD_STEP / 2)
    expect(lifting()).toBe(true)
  })

  it('goes round again while the scene is still loading', () => {
    render(<LoadingScreen />)
    advance(20)
    words(GREETINGS.length)
    expect(showing().textContent).toBe(GREETINGS[0].word)
    expect(lifting()).toBe(false)
  })

  it('skips the words on any click or key, and leaves the moment the scene is ready', () => {
    render(<LoadingScreen />)
    advance(20)
    act(() => { fireEvent.pointerDown(window) })
    expect(showing()).toBeNull()
    expect(lifting()).toBe(false)
    act(() => useDeviceStore.setState({ sceneReady: true }))
    expect(lifting()).toBe(true)
  })

  it('skips the words entirely on a second load in the same session', () => {
    window.sessionStorage.setItem(GREETED_KEY, '1')
    useDeviceStore.setState({ sceneReady: true })
    render(<LoadingScreen />)
    advance(20)
    expect(boot().querySelector('[lang]')).toBeNull()
    expect(lifting()).toBe(true)
  })

  it('skips the words for a visitor who asked for less motion', () => {
    const matchMedia = window.matchMedia
    window.matchMedia = vi.fn((q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    try {
      render(<LoadingScreen />)
      advance(20)
      expect(boot().querySelector('[lang]')).toBeNull()
    } finally {
      window.matchMedia = matchMedia
    }
  })

  it('begins the day as it lifts, quietly, and then leaves the page entirely', () => {
    useDeviceStore.setState({ sceneReady: true })
    render(<LoadingScreen />)
    advance(20)
    expect(useStoryStore.getState().started).toBe(false)
    words(1)
    expect(useStoryStore.getState().started).toBe(true)
    expect(useStoryStore.getState().soundOn).toBe(false)
    expect(useDeviceStore.getState().curtainUp).toBe(true)
    advance(LIFT_MS)
    expect(boot()).toBeNull()
  })
})
