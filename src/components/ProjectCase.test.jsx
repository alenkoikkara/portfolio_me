import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectCase } from './Overlay'
import useDeviceStore from '../scene/useDeviceStore'
import { PROJECTS } from '../data/projects'

const width = window.innerWidth
const setWidth = (w) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })

beforeEach(() => useDeviceStore.setState({ focusedIndex: 0 }))
afterEach(() => setWidth(width))

describe('the case beside a projection', () => {
  it('answers what it was, what Alen did, with what, when and what came of it', () => {
    useDeviceStore.setState({ mode: 'PROJECTING' })
    render(<ProjectCase />)
    const p = PROJECTS[0]
    expect(screen.getByRole('heading', { name: p.title })).toBeTruthy()
    for (const text of [p.outcome, p.role, p.stack.join(' · '), p.timeline, p.result]) expect(screen.getByText(text)).toBeTruthy()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(p.url)
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('stays out of the way while browsing on a desktop, where the chip names the cartridge', () => {
    setWidth(1440)
    useDeviceStore.setState({ mode: 'BROWSING' })
    const { container } = render(<ProjectCase />)
    expect(container.innerHTML).toBe('')
  })

  it('names the one cartridge in view while browsing on a phone, without the details', () => {
    setWidth(390)
    useDeviceStore.setState({ mode: 'BROWSING' })
    render(<ProjectCase />)
    expect(screen.getByRole('heading', { name: PROJECTS[0].title })).toBeTruthy()
    expect(screen.queryByText(PROJECTS[0].role)).toBeNull()
  })
})

describe('the project catalogue', () => {
  it('leads with Alen’s own work, at least half of it, each in its own colour', () => {
    const own = PROJECTS.filter((p) => p.role === 'Design + build')
    expect(own.length * 2).toBeGreaterThanOrEqual(PROJECTS.length)
    expect(PROJECTS[0].role).toBe('Design + build')
    expect(new Set(PROJECTS.map((p) => p.color)).size).toBe(PROJECTS.length)
    expect(new Set(PROJECTS.map((p) => p.title)).size).toBe(PROJECTS.length)
  })
})
