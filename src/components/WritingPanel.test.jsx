import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WritingPanel from './WritingPanel'
import useDeviceStore from '../scene/useDeviceStore'
import { POSTS } from '../data/writing'

beforeEach(() => useDeviceStore.setState({ mode: 'WRITING' }))

describe('the writing panel', () => {
  it('lists every post as a real link, opening in a new tab', () => {
    render(<WritingPanel />)
    expect(screen.getByRole('dialog', { name: 'notes, written down' })).toBeTruthy()
    for (const post of POSTS) {
      const link = screen.getByRole('link', { name: new RegExp(post.title) })
      expect(link.getAttribute('href')).toBe(post.url)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it('closes back to rest', () => {
    render(<WritingPanel />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useDeviceStore.getState().mode).toBe('IDLE')
  })
})
