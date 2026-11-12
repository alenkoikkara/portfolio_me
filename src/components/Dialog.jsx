import React, { useEffect, useId, useRef } from 'react'
import { isTouch } from '../story/environment'

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

/**
 * A section's panel as a real dialog: labelled by its title, modal, the focus
 * moved into it on open and kept there, given back on close to whatever had
 * it before. Escape, a tap outside and its × all close it.
 *
 * Modal on purpose: the backdrop takes the pointer, so a tap beside the panel
 * closes it rather than pressing a key of the device behind — a social key
 * there would open a link from under the dialog.
 */
export default function Dialog({ title, eyebrow, onClose, className = '', children }) {
  const id = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const returnTo = document.activeElement
    const panel = panelRef.current
    // The panel itself takes the focus, so a screen reader lands in it and Tab
    // goes on to its first link — without drawing a ring round that link on a
    // dialog opened with a tap.
    panel?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const last = items[items.length - 1]
      // Round and round inside the panel: modal means the page behind is out of reach.
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        items[0].focus()
      } else if (document.activeElement === panel || !panel.contains(document.activeElement)) {
        // From the panel itself, or from anywhere that focus wandered off to.
        e.preventDefault()
        ;(e.shiftKey ? last : items[0]).focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="overlay">
      <div className="dialog-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`dialog ${className}`}
      >
        {eyebrow && <p className="dialog__eyebrow">{eyebrow}</p>}
        <h2 id={id} className="dialog__title">{title}</h2>
        {children}
        <button type="button" className="dialog__close" onClick={onClose} aria-label={`Close ${eyebrow ?? title}`}>
          ×
        </button>
      </section>
      <div className="overlay-hint">
        <span>{isTouch() ? 'tap outside to close' : 'esc close'}</span>
      </div>
    </div>
  )
}
