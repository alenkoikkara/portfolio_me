import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useDeviceStore from '../scene/useDeviceStore'
import { beginDay } from '../story/navigate'
import { prefersReducedMotion } from '../story/environment'

/* "Hello" in the languages of the places that made this. */
export const GREETINGS = [
  { word: 'hello', lang: 'en' },
  { word: 'नमस्ते', lang: 'hi' },
  { word: 'こんにちは', lang: 'ja' },
  { word: 'hej', lang: 'sv' },
]

/**
 * One word's turn, in ms. The fade is longer than half of it, so the outgoing
 * word is still dissolving as the next arrives: a crossfade, never a gap.
 */
export const WORD_STEP = 1000
/** Words shown before it may leave, however soon the scene is ready: two seconds. */
export const MIN_WORDS = 2
const WORD_FADE = 700
/** The screen's own fade on the way out; matches `.boot`'s transition in index.html. */
export const LIFT_MS = 600
/** Set once the greeting has been seen this session: a second load skips it. */
export const GREETED_KEY = 'hichord:greeted'

const EASE = 'cubic-bezier(0.45, 0, 0.25, 1)'

function greetedThisSession() {
  try {
    return window.sessionStorage.getItem(GREETED_KEY) === '1'
  } catch {
    return false
  }
}

function markGreeted() {
  try {
    window.sessionStorage.setItem(GREETED_KEY, '1')
  } catch {
    // Private mode: the greeting simply plays again next time.
  }
}

/**
 * The loading screen. Its ground is static HTML in
 * index.html, painted before any of this runs; this adopts that element
 * (`#boot`), writes the hellos into it and lifts it.
 *
 * It stays for at least `MIN_WORDS` words, then leaves as soon as it can: at
 * the end of whichever word is showing once the device has drawn its first
 * frame (`sceneReady`) — never mid-word, which reads as a glitch. A click, tap or key skips the words at once (the
 * visible answer to a click while loading), and then it leaves the moment the
 * scene is ready; so does a second load in the same session, or a visitor who
 * asked for less motion, neither of whom sees the words at all.
 *
 * Lifting begins the day: the sun comes up from 05:40 and the device
 * assembles in it as the screen fades.
 */
export default function LoadingScreen() {
  const [greet] = useState(() => !greetedThisSession() && !prefersReducedMotion())
  const [host] = useState(() => document.getElementById('boot'))
  // How many words have been shown, counting from 0 across every pass.
  const [shown, setShown] = useState(0)
  // False for the first frame only, so even the first word fades in.
  const [entered, setEntered] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [lifting, setLifting] = useState(false)
  const sceneReady = useDeviceStore((s) => s.sceneReady)

  useEffect(() => {
    markGreeted()
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const wordsRunning = greet && !skipped && !lifting

  // With words showing, the decision to leave is made only at a word's end.
  useEffect(() => {
    if (!wordsRunning) return undefined
    const next = setTimeout(() => {
      if (useDeviceStore.getState().sceneReady && shown + 1 >= MIN_WORDS) setLifting(true)
      else setShown((n) => n + 1)
    }, WORD_STEP)
    return () => clearTimeout(next)
  }, [shown, wordsRunning])

  // With none — skipped, or never shown — the moment the scene is ready.
  useEffect(() => {
    if (!lifting && !wordsRunning && sceneReady) setLifting(true)
  }, [lifting, wordsRunning, sceneReady])

  useEffect(() => {
    if (lifting || !greet) return undefined
    const skip = () => setSkipped(true)
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [lifting, greet])

  useEffect(() => {
    if (!lifting) return undefined
    beginDay()
    host?.classList.add('boot--lifting')
    const timer = setTimeout(() => host?.remove(), LIFT_MS)
    return () => clearTimeout(timer)
  }, [lifting, host])

  const slot = host?.querySelector('.boot__words')
  if (!slot || !greet) return null

  const active = shown % GREETINGS.length
  return createPortal(
    /*
     * Every word is on the page at once, stacked in one spot, and only the
     * active one is shown — which is what lets the outgoing word fade out while
     * the next fades in. Satoshi has no Devanagari or Japanese, so those fall
     * through to the system's own faces, named so they land on the good ones.
     */
    GREETINGS.map(({ word, lang }, i) => {
      const on = entered && wordsRunning && i === active
      return (
        <span
          key={lang}
          lang={lang}
          aria-hidden={!on}
          data-active={on || undefined}
          className="col-start-1 row-start-1 text-4xl font-medium tracking-tight sm:text-5xl motion-reduce:!transform-none motion-reduce:!filter-none"
          style={{
            color: 'var(--ink)',
            fontFamily: '"Satoshi", "Hiragino Sans", "Noto Sans JP", "Kohinoor Devanagari", "Noto Sans Devanagari", system-ui, sans-serif',
            opacity: on ? 1 : 0,
            transform: on ? 'translateY(0)' : 'translateY(6px)',
            filter: on ? 'blur(0)' : 'blur(6px)',
            transition: `opacity ${WORD_FADE}ms ${EASE}, transform ${WORD_FADE}ms ${EASE}, filter ${WORD_FADE}ms ${EASE}`,
          }}
        >
          {word}
        </span>
      )
    }),
    slot,
  )
}
