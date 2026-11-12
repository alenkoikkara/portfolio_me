import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AVAILABILITY } from '../data/contact'
// The stores the panel under test is using: a fresh module graph per test.
let useDeviceStore
let useStoryStore

beforeEach(() => {
  vi.resetModules()
})

/**
 * The panel, with the published address set as given. Modules are reset so
 * the address can differ per test, which also gives the panel fresh stores —
 * so they are read from the same fresh graph, not imported at the top.
 */
async function panel(email) {
  vi.doMock('../data/contact', async (original) => ({ ...(await original()), CONTACT_EMAIL: email }))
  const { default: ContactPanel } = await import('./ContactPanel')
  useDeviceStore = (await import('../scene/useDeviceStore')).default
  useStoryStore = (await import('../story/useStoryStore')).default
  useDeviceStore.setState({ mode: 'CONTACT' })
  useStoryStore.setState({ chapter: 'contact', started: true, contactResolved: false })
  return render(<ContactPanel />)
}

describe('the contact panel', () => {
  it('is a labelled dialog, with LinkedIn and what Alen is open to', async () => {
    await panel(null)
    const dialog = screen.getByRole('dialog', { name: 'say hello' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('link', { name: 'LinkedIn' }).getAttribute('rel')).toContain('noopener')
    expect(screen.getByText(AVAILABILITY, { exact: false })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull()
  })

  it('resolves the chapter when a link is followed', async () => {
    await panel(null)
    fireEvent.click(screen.getByRole('link', { name: 'LinkedIn' }))
    expect(useStoryStore.getState().contactResolved).toBe(true)
  })

  it('copies the address in one click, saying so, and offers to email it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await panel('hello@example.com')
    expect(screen.getByRole('link', { name: 'Email' }).getAttribute('href')).toBe('mailto:hello@example.com')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    expect(writeText).toHaveBeenCalledWith('hello@example.com')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    expect(useStoryStore.getState().contactResolved).toBe(true)
    vi.unstubAllGlobals()
  })

  it('stays quiet when the clipboard is refused', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await panel('hello@example.com')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(useStoryStore.getState().contactResolved).toBe(false)
    vi.unstubAllGlobals()
  })

  it('closes back to rest from its ×, from Escape, and from a tap outside', async () => {
    const { container } = await panel(null)
    fireEvent.click(screen.getByLabelText('Close contact'))
    expect(useDeviceStore.getState().mode).toBe('IDLE')
    useDeviceStore.setState({ mode: 'CONTACT' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useDeviceStore.getState().mode).toBe('IDLE')
    useDeviceStore.setState({ mode: 'CONTACT' })
    fireEvent.click(container.querySelector('.dialog-backdrop'))
    expect(useDeviceStore.getState().mode).toBe('IDLE')
  })
})
