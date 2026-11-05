import React, { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dialog from './Dialog'

function Opener() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>open</button>
      {open && (
        <Dialog eyebrow="writing" title="notes" onClose={() => setOpen(false)}>
          <a href="/one">one</a>
          <a href="/two">two</a>
        </Dialog>
      )}
    </>
  )
}

describe('a dialog', () => {
  it('takes the focus on open and gives it back on close', () => {
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'open' })
    opener.focus()
    fireEvent.click(opener)
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'notes' }))
    // Tab from the panel goes on to its first link.
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'one' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab inside, round and round', () => {
    render(<Opener />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    const close = screen.getByRole('button', { name: 'Close writing' })
    close.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'one' }))
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(close)
    // Focus that wandered out is brought back in.
    screen.getByRole('button', { name: 'open' }).focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'one' }))
  })

  it('says how to close it in the input’s own words', () => {
    const matchMedia = window.matchMedia
    window.matchMedia = vi.fn((q) => ({ matches: q === '(hover: none)', addEventListener() {}, removeEventListener() {} }))
    try {
      render(<Dialog title="t" onClose={() => {}} />)
      expect(screen.getByText('tap outside to close')).toBeTruthy()
    } finally {
      window.matchMedia = matchMedia
    }
  })

  it('closes on a tap outside the panel, not inside it', () => {
    const onClose = vi.fn()
    const { container } = render(<Dialog title="t" onClose={onClose}><p>inside</p></Dialog>)
    fireEvent.click(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(container.querySelector('.dialog-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
