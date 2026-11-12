import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SunriseSkip from './SunriseSkip'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { sky, PROLOGUE_HOUR } from '../sky'
import { beginDay } from '../navigate'

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  sky.hours = PROLOGUE_HOUR
  useStoryStore.setState({ chapter: 'prologue', started: false, visited: [], travelMs: 0, soundOn: false })
  useDeviceStore.setState({ curtainUp: false, introSkipped: false, introDone: false })
})
afterEach(() => vi.useRealTimers())

describe('skipping the sunrise', () => {
  it('shows nothing before the day begins, and a key skips nothing', () => {
    const { container } = render(<SunriseSkip />)
    expect(container.innerHTML).toBe('')
    fireEvent.keyDown(window, { key: 'a' })
    expect(useDeviceStore.getState().introSkipped).toBe(false)
  })

  it('hints that the sunrise can be skipped, then lets the hint go', () => {
    render(<SunriseSkip />)
    act(() => beginDay())
    expect(screen.getByText('click anywhere to skip')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(2400) })
    expect(screen.getByText('click anywhere to skip').className).toContain('sunrise-skip--gone')
  })

  it('skips the sunrise on any click or key while the device assembles', () => {
    render(<SunriseSkip />)
    act(() => beginDay())
    act(() => { fireEvent.pointerDown(window) })
    expect(useStoryStore.getState().travelMs).toBe(0)
    expect(useDeviceStore.getState().introSkipped).toBe(true)
  })

  it('leaves the page once the device has assembled', () => {
    const { container } = render(<SunriseSkip />)
    act(() => beginDay())
    act(() => useDeviceStore.setState({ introDone: true }))
    expect(container.innerHTML).toBe('')
    useStoryStore.setState({ travelMs: 500 })
    fireEvent.keyDown(window, { key: 'a' })
    expect(useStoryStore.getState().travelMs).toBe(500)
  })
})
