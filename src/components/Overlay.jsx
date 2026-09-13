import React, { useEffect } from 'react'
import useDeviceStore, { GALLERY_MODES } from '../scene/useDeviceStore'
import { PHOTOS } from '../data/photos'

/**
 * DOM overlay rendered outside the Canvas.
 * Provides arrow navigation, project title chip, keyboard shortcuts,
 * and a close button during BROWSING/PROJECTING modes, plus the photography
 * wall's caption and its way back out.
 */
export default function Overlay() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)
  const focus = useDeviceStore((s) => s.focus)
  const closeCarousel = useDeviceStore((s) => s.closeCarousel)
  const insert = useDeviceStore((s) => s.insert)
  const eject = useDeviceStore((s) => s.eject)
  const focusedPhotoId = useDeviceStore((s) => s.focusedPhotoId)
  const focusPhoto = useDeviceStore((s) => s.focusPhoto)
  const closeGallery = useDeviceStore((s) => s.closeGallery)

  const inGallery = GALLERY_MODES.has(mode)

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
      } else if (inGallery && e.key === 'Escape') {
        e.preventDefault()
        // Escape undoes one step at a time: out of the print first, then out of
        // the gallery. Leaving outright from a focused print would skip the wall
        // the visitor was reading.
        if (focusedPhotoId) focusPhoto(null)
        else closeGallery()
      }
      // Arrow keys in the gallery pan the wall, and are handled by the camera
      // that owns the pan target rather than here.
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, inGallery, focusedIndex, focus, closeCarousel, insert, eject, focusedPhotoId, focusPhoto, closeGallery])

  if (mode === 'IDLE') return null

  if (inGallery) {
    const photo = PHOTOS.find((p) => p.id === focusedPhotoId)
    const meta = photo && [photo.location, photo.year].filter(Boolean).join(' · ')
    // Only when something has actually been written about the photo. Falling
    // back to the id would print "img4" under a photograph.
    const captioned = Boolean(photo && (photo.caption || meta))

    return (
      <div className="overlay">
        <button
          className="overlay-close"
          onClick={focusedPhotoId ? () => focusPhoto(null) : closeGallery}
          aria-label={focusedPhotoId ? 'Back to the wall' : 'Close gallery'}
        >
          ×
        </button>

        {/* Only the print being viewed is captioned; the wall itself stays silent. */}
        <div className={`overlay-caption ${captioned ? 'overlay-caption--visible' : ''}`}>
          {photo?.caption && <span className="overlay-caption-title">{photo.caption}</span>}
          {meta && <span className="overlay-caption-meta">{meta}</span>}
        </div>

        <div className="overlay-hint">
          {focusedPhotoId ? <span>esc back</span> : <span>drag to pan</span>}
          {!focusedPhotoId && <span>click a print</span>}
          {!focusedPhotoId && <span>esc close</span>}
        </div>
      </div>
    )
  }

  const isBrowsing = mode === 'BROWSING'
  const isProjecting = mode === 'PROJECTING'

  return (
    <div className="overlay">
      {/* Left arrow — only during BROWSING */}
      {isBrowsing && (
        <button
          className="overlay-arrow overlay-arrow-left"
          onClick={() => focus(focusedIndex - 1)}
          aria-label="Previous project"
        >
          ‹
        </button>
      )}

      {/* Right arrow — only during BROWSING */}
      {isBrowsing && (
        <button
          className="overlay-arrow overlay-arrow-right"
          onClick={() => focus(focusedIndex + 1)}
          aria-label="Next project"
        >
          ›
        </button>
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
