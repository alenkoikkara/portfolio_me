import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import LoadingScreen, { GREETINGS, WORD_STEP, LIFT_MS } from './LoadingScreen'
import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from '../story/useStoryStore'

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })
/*
 * A word at a time: each word's timer is set by an effect that only runs once
 * React has committed the last one, so one long jump would cover a single word.
 */
const words = (n) => { for (let i = 0; i < n; i++) advance(WORD_STEP) }
const showing = (container) => container.querySelector('[data-active]')
const lifting = (container) => container.firstChild?.className.includes('opacity-0') ?? false

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  useDeviceStore.setState({ sceneReady: false, curtainUp: false })
  useStoryStore.setState({ chapter: 'prologue', started: false, soundOn: false })
})
afterEach(() => vi.useRealTimers())

describe('the loading screen', () => {
  it('says hello in each language in turn, each tagged with its language', () => {
    const { container } = render(<LoadingScreen />)
    advance(20) // the first word fades in from the second frame
    for (const { word, lang } of GREETINGS) {
      expect(showing(container).textContent).toBe(word)
      expect(showing(container).getAttribute('lang')).toBe(lang)
      words(1)
    }
  })

  it('shows one word at a time, the rest faded out beneath it', () => {
    const { container } = render(<LoadingScreen />)
    advance(20)
    expect(container.querySelectorAll('[data-active]')).toHaveLength(1)
    const hidden = [...container.querySelectorAll('[lang]')].filter((el) => !el.dataset.active)
    expect(hidden).toHaveLength(GREETINGS.length - 1)
    for (const el of hidden) expect(el.style.opacity).toBe('0')
  })

  it('says all four even when the scene is ready at once', () => {
    useDeviceStore.setState({ sceneReady: true })
    const { container } = render(<LoadingScreen />)
    advance(20)
    words(GREETINGS.length - 1)
    expect(showing(container).textContent).toBe(GREETINGS.at(-1).word)
    expect(lifting(container)).toBe(false)
    words(1)
    expect(lifting(container)).toBe(true)
  })

  it('goes round again while the scene is still loading, and leaves at a word boundary', () => {
    const { container } = render(<LoadingScreen />)
    advance(20)
    words(GREETINGS.length)
    advance(WORD_STEP / 2)
    expect(showing(container).textContent).toBe(GREETINGS[0].word)
    act(() => useDeviceStore.setState({ sceneReady: true }))
    // Mid-word: it finishes the word first.
    expect(lifting(container)).toBe(false)
    advance(WORD_STEP / 2)
    expect(lifting(container)).toBe(true)
  })

  it('fades out, then leaves the page entirely', () => {
    useDeviceStore.setState({ sceneReady: true })
    const { container } = render(<LoadingScreen />)
    advance(20)
    words(GREETINGS.length)
    expect(container.firstChild.className).toContain('opacity-0')
    expect(container.firstChild.className).toContain('pointer-events-none')
    // The last word fades with the screen rather than being left behind.
    expect(showing(container)).toBeNull()
    advance(LIFT_MS)
    expect(container.innerHTML).toBe('')
  })

  it('begins the day as it lifts, quietly', () => {
    useDeviceStore.setState({ sceneReady: true })
    render(<LoadingScreen />)
    advance(20)
    words(GREETINGS.length - 1)
    expect(useStoryStore.getState().started).toBe(false)
    words(1)
    expect(useStoryStore.getState().started).toBe(true)
    expect(useStoryStore.getState().soundOn).toBe(false)
    expect(useDeviceStore.getState().curtainUp).toBe(true)
  })
})
