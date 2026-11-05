import React, { useEffect, useState } from 'react'
import { isTouch } from '../environment'

/** What the keyboard does, in the order the sections sit on the device. */
export const SHORTCUTS = [
  ['1', 'projects'],
  ['2', 'photography'],
  ['3', 'about'],
  ['4', 'contact'],
  ['5', 'writing'],
  ['esc', 'back'],
  ['m', 'sound'],
  ['?', 'this list'],
]

/**
 * A small "?" in the story's corner that lists the keyboard, opened by it or
 * by the ? key — not shown on a touch screen. Escape closes it first — on capture, and swallowed, so the
 * same press does not also step out of the section underneath.
 */
export default function KeyHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === '?') {
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        e.stopImmediatePropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  // A finger has no keyboard to list.
  if (isTouch()) return null

  return (
    <span className="key-help">
      <button
        type="button"
        className="story-hud__button text-xs"
        aria-expanded={open}
        aria-controls="key-help-list"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <dl id="key-help-list" className="key-help__list text-xs">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="key-help__row">
              <dt><kbd>{key}</kbd></dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      )}
    </span>
  )
}
