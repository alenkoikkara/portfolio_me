import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import useStoryRouting from './useStoryRouting'
import useStoryStore from './useStoryStore'
import useDeviceStore from '../scene/useDeviceStore'
import { bridgeDeviceToStory } from './bridge'
import { sky, HOME_HOUR } from './sky'

function Harness() {
  useStoryRouting()
  return null
}

let unsubscribe
const device = () => useDeviceStore.getState()

beforeEach(() => {
  sky.hours = HOME_HOUR
  window.history.replaceState({}, '', '/')
  useDeviceStore.setState({ mode: 'IDLE', focusedPhotoId: null, pendingHome: false, pendingIndex: null })
  useStoryStore.setState({ chapter: 'home', started: true, visited: [] })
  unsubscribe = bridgeDeviceToStory()
})
afterEach(() => unsubscribe())

describe('chapters as pages', () => {
  it('gives each chapter its address and title, and home its own', () => {
    render(<Harness />)
    expect(document.title).toBe('alen koikkara')
    act(() => device().openAbout())
    expect(window.location.pathname).toBe('/about')
    expect(document.title).toBe('about · alen koikkara')
    expect(document.documentElement.dataset.chapter).toBe('about')
    act(() => { device().aboutOpened(); device().closeAbout(); device().aboutClosed() })
    expect(window.location.pathname).toBe('/')
  })

  it('goes back through the chapters with the browser', () => {
    render(<Harness />)
    act(() => device().openGallery())
    expect(window.location.pathname).toBe('/photography')
    const entries = window.history.length
    // Back: the browser has already moved the address home.
    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(device().mode).toBe('CLOSING_GALLERY')
    act(() => device().galleryClosed())
    expect(useStoryStore.getState().chapter).toBe('home')
    // Replaying history pushes nothing of its own.
    expect(window.history.length).toBe(entries)
  })

  it('goes forward into a chapter from another, without pushing the steps between', () => {
    render(<Harness />)
    act(() => { device().openAbout(); device().aboutOpened() })
    const entries = window.history.length
    act(() => {
      window.history.replaceState({}, '', '/projects')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    act(() => device().aboutClosed())
    expect(device().mode).toBe('BROWSING')
    expect(window.location.pathname).toBe('/projects')
    expect(window.history.length).toBe(entries)
  })

  it('opens chapters from the number keys, but not while typing or with a modifier', () => {
    render(<Harness />)
    act(() => { fireEvent.keyDown(window, { key: '2', metaKey: true }) })
    expect(device().mode).toBe('IDLE')
    const input = document.createElement('input')
    document.body.appendChild(input)
    act(() => { fireEvent.keyDown(input, { key: '2' }) })
    expect(device().mode).toBe('IDLE')
    input.remove()
    act(() => { fireEvent.keyDown(window, { key: '2' }) })
    expect(device().mode).toBe('OPENING_GALLERY')
  })

  it('toggles sound with M', () => {
    useStoryStore.setState({ soundOn: false })
    render(<Harness />)
    act(() => { fireEvent.keyDown(window, { key: 'm' }) })
    expect(useStoryStore.getState().soundOn).toBe(true)
    act(() => { fireEvent.keyDown(window, { key: 'M' }) })
    expect(useStoryStore.getState().soundOn).toBe(false)
  })

  it('ignores a pop to where the story already is', () => {
    render(<Harness />)
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(device().mode).toBe('IDLE')
  })
})

describe('before the visitor begins', () => {
  it('ignores the number keys and history, and gives the Prologue the site’s own address', () => {
    useStoryStore.setState({ chapter: 'prologue', started: false })
    window.history.replaceState({}, '', '/contact')
    render(<Harness />)
    // A section with no page yet is replaced, not left in the address bar.
    expect(window.location.pathname).toBe('/')
    expect(document.title).toBe('alen koikkara')
    act(() => { fireEvent.keyDown(window, { key: '1' }) })
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(device().mode).toBe('IDLE')
  })
})
