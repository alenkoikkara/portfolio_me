import React, { useEffect } from 'react'
import useDeviceStore, { ABOUT_MODES, GALLERY_MODES } from '../scene/useDeviceStore'
import { PHOTOS } from '../data/photos'
import { formatSettings } from '../data/exif'
import { FOCUS_FILL_HEIGHT, FOCUS_FILL_WIDTH } from '../scene/galleryLayout'

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
  const closeAbout = useDeviceStore((s) => s.closeAbout)

  const inGallery = GALLERY_MODES.has(mode)
  const inAbout = ABOUT_MODES.has(mode)

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
      } else if (inAbout && e.key === 'Escape') {
        e.preventDefault()
        // A no-op once already closing, by the store's own guard.
        closeAbout()
      }
      // Arrow keys in the gallery pan the wall, and are handled by the camera
      // that owns the pan target rather than here.
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, inGallery, inAbout, focusedIndex, focus, closeCarousel, insert, eject, focusedPhotoId, focusPhoto, closeGallery, closeAbout])

  if (mode === 'IDLE') return null

  if (inGallery) {
    const photo = PHOTOS.find((p) => p.id === focusedPhotoId)
    const meta = photo && [photo.location, photo.year].filter(Boolean).join(' · ')
    // Only when something has actually been written about the photo. Falling
    // back to the id would print "img4" under a photograph.
    const captioned = Boolean(photo && (photo.caption || meta))
    // The camera settings, read from the photo's EXIF when the wall was built.
    // A photo whose EXIF was stripped has none, and shows no line at all.
    const settings = formatSettings(photo?.exposure)
    const camera = photo?.exposure?.camera ?? ''

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

        {/*
          * Just under the opened print, and exactly as wide: settings at its
          * left edge, camera at its right. The print is centred and fills
          * FOCUS_FILL_WIDTH of the window's width or FOCUS_FILL_HEIGHT of its
          * height, whichever it meets first (Gallery.jsx), and `min()` makes the
          * same choice here — so the line tracks the print through a resize
          * without any JavaScript watching it.
          */}
        <div
          className={`overlay-exposure ${settings || camera ? 'overlay-exposure--visible' : ''}`}
          style={photo ? {
            width: `min(${FOCUS_FILL_WIDTH * 100}vw, ${FOCUS_FILL_HEIGHT * 100 * photo.aspect}vh)`,
            top: `calc(50% + min(${FOCUS_FILL_HEIGHT * 50}vh, ${(FOCUS_FILL_WIDTH * 50) / photo.aspect}vw) + 14px)`,
          } : undefined}
        >
          <span>{settings}</span>
          <span>{camera}</span>
        </div>

        <div className="overlay-hint">
          {focusedPhotoId ? <span>esc back</span> : <span>drag to pan</span>}
          {!focusedPhotoId && <span>click a print</span>}
          {!focusedPhotoId && <span>esc close</span>}
        </div>
      </div>
    )
  }

  /*
   * The about panel brings its own words, so the overlay adds only the way
   * out: a close button, which a phone needs, having no Escape key, and the
   * hint for those who do.
   */
  if (inAbout) {
    return (
      <div className="overlay">
        <button className="overlay-close" onClick={closeAbout} aria-label="Close about">
          ×
        </button>
        <div className="overlay-hint">
          <span>esc close</span>
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
