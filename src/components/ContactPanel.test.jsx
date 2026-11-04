import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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
  it('offers the links, and no email row while none is published', async () => {
    await panel(null)
    expect(screen.getByText('say hello')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'linkedin' }).getAttribute('rel')).toContain('noopener')
    expect(screen.queryByRole('link', { name: 'write' })).toBeNull()
  })

  it('resolves the held chord when a link is followed', async () => {
    await panel(null)
    fireEvent.click(screen.getByRole('link', { name: 'github' }))
    expect(useStoryStore.getState().contactResolved).toBe(true)
  })

  it('offers to write or copy a published address, and either reaches out', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await panel('hello@example.com')
    expect(screen.getByRole('link', { name: 'write' }).getAttribute('href')).toBe('mailto:hello@example.com')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'copy' })) })
    expect(writeText).toHaveBeenCalledWith('hello@example.com')
    expect(screen.getByRole('button', { name: 'copied' })).toBeTruthy()
    expect(useStoryStore.getState().contactResolved).toBe(true)
    vi.unstubAllGlobals()
  })

  it('stays quiet when the clipboard is refused', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await panel('hello@example.com')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'copy' })) })
    expect(screen.getByRole('button', { name: 'copy' })).toBeTruthy()
    expect(useStoryStore.getState().contactResolved).toBe(false)
    vi.unstubAllGlobals()
  })

  it('closes back to rest', async () => {
    await panel(null)
    fireEvent.click(screen.getByLabelText('Close contact'))
    expect(useDeviceStore.getState().mode).toBe('IDLE')
  })
})
