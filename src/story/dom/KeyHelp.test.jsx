import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent, within } from '@testing-library/react'
import KeyHelp, { SHORTCUTS } from './KeyHelp'

const list = () => document.getElementById('key-help-list')

describe('the keyboard list', () => {
  it('opens from its button and lists every shortcut', () => {
    render(<KeyHelp />)
    expect(list()).toBeNull()
    act(() => screen.getByRole('button', { name: 'Keyboard shortcuts' }).click())
    expect(screen.getByRole('button', { name: 'Keyboard shortcuts' }).getAttribute('aria-expanded')).toBe('true')
    for (const [key, what] of SHORTCUTS) {
      expect(within(list()).getByText(key)).toBeTruthy()
      expect(within(list()).getByText(what)).toBeTruthy()
    }
  })

  it('toggles with the ? key, but not while typing', () => {
    render(<><KeyHelp /><input aria-label="message" /></>)
    fireEvent.keyDown(window, { key: '?' })
    expect(list()).not.toBeNull()
    fireEvent.keyDown(window, { key: '?' })
    expect(list()).toBeNull()
    fireEvent.keyDown(screen.getByLabelText('message'), { key: '?' })
    expect(list()).toBeNull()
    fireEvent.keyDown(window, { key: '?', metaKey: true })
    expect(list()).toBeNull()
  })

  it('takes Escape for itself while open, so the section underneath stays', () => {
    const behind = vi.fn()
    window.addEventListener('keydown', behind)
    render(<KeyHelp />)
    fireEvent.keyDown(window, { key: '?' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(list()).toBeNull()
    expect(behind.mock.calls.filter(([e]) => e.key === 'Escape')).toHaveLength(0)
    // Closed, Escape is left for the page.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(behind.mock.calls.filter(([e]) => e.key === 'Escape')).toHaveLength(1)
    window.removeEventListener('keydown', behind)
  })
})
