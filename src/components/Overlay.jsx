import React, { useEffect } from 'react'
import useDeviceStore from '../scene/useDeviceStore'
import { PROJECTS } from '../data/projects'

/**
 * DOM overlay rendered outside the Canvas.
 * Provides arrow navigation, project title chip, keyboard shortcuts,
 * and a close button during BROWSING/PROJECTING modes.
 */
export default function Overlay() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const focus = useDeviceStore((s) => s.focus)
  const closeCarousel = useDeviceStore((s) => s.closeCarousel)
  const insert = useDeviceStore((s) => s.insert)
  const eject = useDeviceStore((s) => s.eject)

  // Global keyboard listener
  useEffect(() => {
    if (mode === 'IDLE') return

    const onKey = (e) => {
      if (mode === 'BROWSING') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          focus(focusedIndex - 1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          focus(focusedIndex + 1)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          closeCarousel()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          insert(focusedIndex)
        }
      } else if (mode === 'PROJECTING') {
        if (e.key === 'Escape') {
          e.preventDefault()
          eject()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, focusedIndex, focus, closeCarousel, insert, eject])

  if (mode === 'IDLE') return null

  const project = PROJECTS[focusedIndex]
  const isBrowsing = mode === 'BROWSING'
  const isProjecting = mode === 'PROJECTING'
  const canGoLeft = focusedIndex > 0
  const canGoRight = focusedIndex < PROJECTS.length - 1

  return (
    <div className="overlay">
      {/* Left arrow — only during BROWSING */}
      {isBrowsing && (
        <button
          className={`overlay-arrow overlay-arrow-left ${!canGoLeft ? 'overlay-arrow-disabled' : ''}`}
          onClick={() => focus(focusedIndex - 1)}
          disabled={!canGoLeft}
          aria-label="Previous project"
        >
          ‹
        </button>
      )}

      {/* Right arrow — only during BROWSING */}
      {isBrowsing && (
        <button
          className={`overlay-arrow overlay-arrow-right ${!canGoRight ? 'overlay-arrow-disabled' : ''}`}
          onClick={() => focus(focusedIndex + 1)}
          disabled={!canGoRight}
          aria-label="Next project"
        >
          ›
        </button>
      )}

      {/* Project title chip — the projector card carries this while projecting */}
      {project && !isProjecting && (
        <div className="overlay-chip">
          <span className="overlay-chip-dot" style={{ backgroundColor: project.color }} />
          <span className="overlay-chip-title">{project.title}</span>
          <span className="overlay-chip-subtitle">{project.subtitle}</span>
        </div>
      )}

      {/* Close button — BROWSING or PROJECTING */}
      {(isBrowsing || isProjecting) && (
        <button
          className="overlay-close"
          onClick={isBrowsing ? closeCarousel : eject}
          aria-label={isBrowsing ? 'Close carousel' : 'Eject cartridge'}
        >
          ×
        </button>
      )}

      {/* Navigation hint */}
      <div className="overlay-hint">
        {isBrowsing && <span>← → navigate</span>}
        {isBrowsing && <span>↵ select</span>}
        {isProjecting && <span>esc eject</span>}
        {isBrowsing && <span>esc close</span>}
      </div>
    </div>
  )
}
