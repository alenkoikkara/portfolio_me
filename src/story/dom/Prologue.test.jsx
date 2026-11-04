import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Prologue from './Prologue'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { sky, PROLOGUE_HOUR } from '../sky'
import { PROLOGUE_CAPTION } from '../chapters'

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  sky.hours = PROLOGUE_HOUR
  useStoryStore.setState({ chapter: 'prologue', started: false, visited: [], travelMs: 0, soundOn: false })
  useDeviceStore.setState({ curtainUp: false, introSkipped: false, introDone: false })
})
afterEach(() => vi.useRealTimers())

describe('the Prologue', () => {
  it('sets the scene before dawn and offers a way in', () => {
    render(<Prologue />)
    expect(screen.getByText('05:40 · chicago')).toBeTruthy()
    expect(screen.getByText(PROLOGUE_CAPTION)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'begin with sound' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'begin quietly' })).toBeTruthy()
  })

  it('begins with sound or without it, as chosen', () => {
    render(<Prologue />)
    fireEvent.click(screen.getByRole('button', { name: 'begin with sound' }))
    expect(useStoryStore.getState().soundOn).toBe(true)
  })

  it('begins the day, and hints that the sunrise can be skipped', () => {
    render(<Prologue />)
    fireEvent.click(screen.getByRole('button', { name: 'begin quietly' }))
    expect(useStoryStore.getState().started).toBe(true)
    expect(useDeviceStore.getState().curtainUp).toBe(true)
    expect(screen.getByText('click anywhere to skip')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(2400) })
    expect(screen.getByText('click anywhere to skip').className).toContain('prologue__skip--gone')
  })

  it('skips the sunrise on any click or key while the device assembles', () => {
    render(<Prologue />)
    fireEvent.click(screen.getByRole('button', { name: 'begin quietly' }))
    act(() => { fireEvent.pointerDown(window) })
    expect(useStoryStore.getState().travelMs).toBe(0)
    expect(useDeviceStore.getState().introSkipped).toBe(true)
  })

  it('leaves the page once the device has assembled', () => {
    const { container } = render(<Prologue />)
    fireEvent.click(screen.getByRole('button', { name: 'begin quietly' }))
    act(() => useDeviceStore.setState({ introDone: true }))
    expect(container.innerHTML).toBe('')
    // And a key no longer skips anything.
    useStoryStore.setState({ travelMs: 500 })
    fireEvent.keyDown(window, { key: 'a' })
    expect(useStoryStore.getState().travelMs).toBe(500)
  })
})
