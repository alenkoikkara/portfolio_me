import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import StoryHUD, { clockFace } from './StoryHUD'
import useStoryStore from '../useStoryStore'
import { sky, HOME_HOUR } from '../sky'
import { CHAPTERS, homeCaption } from '../chapters'

beforeEach(() => {
  sky.hours = HOME_HOUR
  useStoryStore.setState({ chapter: 'home', started: true })
})

describe('the clock', () => {
  it('reads hours and minutes, and the day once past the first', () => {
    expect(clockFace(8 + 10 / 60)).toEqual({ time: '08:10', day: '' })
    expect(clockFace(23.5)).toEqual({ time: '23:30', day: '' })
    expect(clockFace(24 + 6 + 5 / 60)).toEqual({ time: '06:05', day: 'day 2' })
  })
})

describe('the story corner', () => {
  it('shows home’s caption for the hour, and the name as the way home', () => {
    render(<StoryHUD />)
    expect(screen.getByText(homeCaption(HOME_HOUR))).toBeTruthy()
    expect(screen.getByLabelText('Back to the start')).toBeTruthy()
  })

  it('has a sound toggle that says what it is', () => {
    useStoryStore.setState({ soundOn: false })
    render(<StoryHUD />)
    const toggle = screen.getByRole('button', { name: 'sound off' })
    act(() => toggle.click())
    expect(useStoryStore.getState().soundOn).toBe(true)
    expect(screen.getByRole('button', { name: 'sound on' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('shows a section’s title and caption while in it', () => {
    render(<StoryHUD />)
    act(() => useStoryStore.setState({ chapter: 'photography' }))
    expect(screen.getByText('photography')).toBeTruthy()
    expect(screen.getByText(CHAPTERS.photography.caption)).toBeTruthy()
  })
})
