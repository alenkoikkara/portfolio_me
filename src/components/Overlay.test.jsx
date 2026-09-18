import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Overlay from './Overlay'
import useDeviceStore from '../scene/useDeviceStore'
import { PROJECTS } from '../data/projects'
import { PHOTOS } from '../data/photos'

const set = (state) => useDeviceStore.setState(state)
const get = () => useDeviceStore.getState()
const press = (key) => fireEvent.keyDown(window, { key })

beforeEach(() => {
  set({
    mode: 'IDLE',
    focusedIndex: 0,
    activeId: null,
    pendingIndex: null,
    focusedPhotoId: null,
  })
})

describe('at rest', () => {
  it('puts nothing on the page', () => {
    const { container } = render(<Overlay />)
    expect(container.innerHTML).toBe('')
  })

  it('does not take the arrow keys from the page', () => {
    render(<Overlay />)
    const before = get().focusedIndex
    press('ArrowRight')
    expect(get().focusedIndex).toBe(before)
  })
})

describe('browsing the carousel', () => {
  beforeEach(() => set({ mode: 'BROWSING' }))

  it('offers both arrows and a way out', () => {
    render(<Overlay />)
    expect(screen.getByLabelText('Previous project')).toBeTruthy()
    expect(screen.getByLabelText('Next project')).toBeTruthy()
    expect(screen.getByLabelText('Close carousel')).toBeTruthy()
  })

  it('moves focus with the arrow buttons, wrapping at the ends', () => {
    render(<Overlay />)
    fireEvent.click(screen.getByLabelText('Next project'))
    expect(get().focusedIndex).toBe(1)
    fireEvent.click(screen.getByLabelText('Previous project'))
    expect(get().focusedIndex).toBe(0)
    fireEvent.click(screen.getByLabelText('Previous project'))
    expect(get().focusedIndex).toBe(PROJECTS.length - 1)
  })

  it('moves focus with the arrow keys', () => {
    render(<Overlay />)
    press('ArrowRight')
    expect(get().focusedIndex).toBe(1)
    press('ArrowLeft')
    expect(get().focusedIndex).toBe(0)
  })

  it('inserts the focused cartridge on Enter', () => {
    render(<Overlay />)
    press('ArrowRight')
    press('Enter')
    expect(get().mode).toBe('INSERTING')
    expect(get().activeId).toBe(PROJECTS[1].id)
  })

  it('closes on Escape and on the close button', () => {
    const { unmount } = render(<Overlay />)
    press('Escape')
    expect(get().mode).toBe('IDLE')
    unmount()

    set({ mode: 'BROWSING' })
    render(<Overlay />)
    fireEvent.click(screen.getByLabelText('Close carousel'))
    expect(get().mode).toBe('IDLE')
  })

  it('says how to drive it', () => {
    render(<Overlay />)
    expect(screen.getByText('← → navigate')).toBeTruthy()
    expect(screen.getByText('↵ select')).toBeTruthy()
  })
})

describe('while projecting', () => {
  beforeEach(() => set({ mode: 'PROJECTING', activeId: PROJECTS[0].id }))

  it('offers eject rather than close, and no arrows', () => {
    render(<Overlay />)
    expect(screen.getByLabelText('Eject cartridge')).toBeTruthy()
    expect(screen.queryByLabelText('Next project')).toBeNull()
  })

  it('ejects on Escape and on the button', () => {
    const { unmount } = render(<Overlay />)
    press('Escape')
    expect(get().mode).toBe('EJECTING')
    unmount()

    set({ mode: 'PROJECTING' })
    render(<Overlay />)
    fireEvent.click(screen.getByLabelText('Eject cartridge'))
    expect(get().mode).toBe('EJECTING')
  })
})

describe('the photography wall', () => {
  beforeEach(() => set({ mode: 'GALLERY' }))

  it('tells you how to move around it', () => {
    render(<Overlay />)
    expect(screen.getByText('drag to pan')).toBeTruthy()
    expect(screen.getByText('click a print')).toBeTruthy()
    expect(screen.getByLabelText('Close gallery')).toBeTruthy()
  })

  it('closes on Escape when no print is open', () => {
    render(<Overlay />)
    press('Escape')
    expect(get().mode).toBe('CLOSING_GALLERY')
  })

  it('steps out of the print first, and only then out of the gallery', () => {
    set({ focusedPhotoId: PHOTOS[0].id })
    render(<Overlay />)

    press('Escape')
    // Back to the wall, which is what the visitor was reading.
    expect(get().focusedPhotoId).toBeNull()
    expect(get().mode).toBe('GALLERY')

    press('Escape')
    expect(get().mode).toBe('CLOSING_GALLERY')
  })

  it('offers a way back to the wall while a print is open', () => {
    set({ focusedPhotoId: PHOTOS[0].id })
    render(<Overlay />)
    expect(screen.getByText('esc back')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Back to the wall'))
    expect(get().focusedPhotoId).toBeNull()
    expect(get().mode).toBe('GALLERY')
  })

  it('leaves the arrow keys to the camera, which owns the pan target', () => {
    render(<Overlay />)
    const before = get().focusedIndex
    press('ArrowRight')
    press('ArrowDown')
    expect(get().focusedIndex).toBe(before)
    expect(get().mode).toBe('GALLERY')
  })

  it('shows no chrome from the cartridge arm', () => {
    render(<Overlay />)
    expect(screen.queryByLabelText('Next project')).toBeNull()
    expect(screen.queryByText('↵ select')).toBeNull()
  })
})

describe('the caption', () => {
  beforeEach(() => set({ mode: 'GALLERY' }))

  it('stays silent while the wall is being read', () => {
    const { container } = render(<Overlay />)
    expect(container.querySelector('.overlay-caption--visible')).toBeNull()
  })

  it('never falls back to the filename', () => {
    // A photo with nothing written about it gets no caption, not "img4".
    const bare = PHOTOS.find((p) => !p.caption && !p.location && !p.year)
    if (!bare) return
    set({ focusedPhotoId: bare.id })
    const { container } = render(<Overlay />)
    expect(container.querySelector('.overlay-caption--visible')).toBeNull()
    expect(screen.queryByText(bare.id)).toBeNull()
  })

  it('shows what has been written, when there is something', () => {
    // Stand a captioned photo in, since the shipped set carries none yet.
    const captioned = { ...PHOTOS[0], caption: 'Closing time', location: 'Edinburgh', year: 2024 }
    vi.spyOn(PHOTOS, 'find').mockReturnValue(captioned)
    set({ focusedPhotoId: captioned.id })
    const { container } = render(<Overlay />)
    expect(screen.getByText('Closing time')).toBeTruthy()
    expect(screen.getByText('Edinburgh · 2024')).toBeTruthy()
    expect(container.querySelector('.overlay-caption--visible')).toBeTruthy()
    vi.restoreAllMocks()
  })
})

describe('keyboard listener lifecycle', () => {
  it('stops listening once it unmounts', () => {
    set({ mode: 'BROWSING' })
    const { unmount } = render(<Overlay />)
    unmount()
    press('ArrowRight')
    expect(get().focusedIndex).toBe(0)
  })
})
