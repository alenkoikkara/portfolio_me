import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const playSong = vi.fn(() => () => {})
vi.mock('../../scene/audio', async (original) => ({ ...(await original()), playSong: (...args) => playSong(...args) }))

const { default: SongPrompt } = await import('./SongPrompt')
const { default: useStoryStore } = await import('../useStoryStore')
const { default: useDeviceStore } = await import('../../scene/useDeviceStore')
const { CHAPTERS } = await import('../chapters')
const { CHORDS, music } = await import('../chords')

const ALL = ['about', 'projects', 'contact', 'writing', 'photography']

// Switched off for the submission; on here, so the song keeps working for later.
beforeEach(() => { music.on = true })
afterEach(() => { music.on = false })

it('is not offered while the music is switched off', () => {
  music.on = false
  useStoryStore.setState({ chapter: 'home', started: true, visited: ['about', 'projects', 'contact', 'photography'], sharedSong: null })
  const { container } = render(<SongPrompt />)
  expect(container.innerHTML).toBe('')
})

beforeEach(() => {
  playSong.mockClear()
  useStoryStore.setState({ chapter: 'home', started: true, visited: [], sharedSong: null, soundOn: false })
  useDeviceStore.setState({ pressedKey: null })
})

describe('the song', () => {
  it('waits until every chapter has been visited, and for home', () => {
    useStoryStore.setState({ visited: ALL.slice(0, 4) })
    const { container, rerender } = render(<SongPrompt />)
    expect(container.innerHTML).toBe('')
    act(() => useStoryStore.setState({ visited: ALL, chapter: 'about' }))
    rerender(<SongPrompt />)
    expect(container.innerHTML).toBe('')
    act(() => useStoryStore.setState({ chapter: 'home' }))
    expect(screen.getByText('your visit, in five chords')).toBeTruthy()
  })

  it('plays the visit in order, turning sound on, pressing each chapter’s key, and resolving home', () => {
    useStoryStore.setState({ visited: ALL })
    render(<SongPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(useStoryStore.getState().soundOn).toBe(true)
    const [chords, { home, onStep }] = playSong.mock.calls[0]
    expect(chords).toEqual(ALL.map((c) => CHAPTERS[c].chord))
    expect(home).toEqual(CHORDS.resolve)
    onStep(2)
    expect(useDeviceStore.getState().pressedKey.name).toBe('Key_Bot_3')
  })

  it('copies the link that replays it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    useStoryStore.setState({ visited: ALL })
    render(<SongPrompt />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'copy link' })) })
    expect(writeText.mock.calls[0][0]).toMatch(/\/\?song=apcwf$/)
    expect(screen.getByRole('button', { name: 'copied' })).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('shows someone else’s song from a shared link, to play but not to pass on again', () => {
    useStoryStore.setState({ sharedSong: ['photography', 'projects', 'about', 'contact'] })
    render(<SongPrompt />)
    expect(screen.getByText('someone’s visit, in five chords')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'copy link' })).toBeNull()
  })

  it('can be dismissed', () => {
    useStoryStore.setState({ visited: ALL })
    const { container } = render(<SongPrompt />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(container.innerHTML).toBe('')
  })
})
