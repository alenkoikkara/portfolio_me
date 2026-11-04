import React, { useEffect, useState } from 'react'
import useDeviceStore from '../scene/useDeviceStore'

/*
 * "Hello" in the languages of the places that made this — once through, at
 * least. The colour is in the letters themselves: each word runs from a light
 * tone of its hue (`from`) to a deeper one (`to`) — peach, marigold, sakura and
 * a Nordic sky — light enough to stay gentle, deep enough at its end to read.
 */
export const GREETINGS = [
  { word: 'hello', lang: 'en', from: '#f4a988', to: '#c8785a' },
  { word: 'नमस्ते', lang: 'hi', from: '#f2c25a', to: '#c08a1e' },
  { word: 'こんにちは', lang: 'ja', from: '#f39ab8', to: '#c9668a' },
  { word: 'hej', lang: 'sv', from: '#8fbde8', to: '#5a8bbd' },
]

/**
 * One word's turn, in ms. The fade is longer than half of it, so the outgoing
 * word is still dissolving as the next arrives: a crossfade, never a gap of
 * empty page between two words.
 */
export const WORD_STEP = 900
const WORD_FADE = 700
/** The screen's own fade on the way out. */
export const LIFT_MS = 1100

// One gentle curve for every move on the screen, in and out alike.
const EASE = 'cubic-bezier(0.45, 0, 0.25, 1)'

/**
 * The greeting while the scene loads: one word at a time, on the page colour,
 * so lifting it reveals the device on the same ground rather than cutting to it.
 *
 * It says all four once whatever happens — on a warm cache the scene is ready
 * before "hello" has faded, and the greeting is the point — and after that
 * leaves at the end of whichever word is showing once the device has drawn its
 * first frame (`sceneReady`). If loading takes longer it simply goes round
 * again. It never leaves mid-word: a word cut off reads as a glitch.
 *
 * Lifting reveals the Prologue beneath it, at 05:40; the Prologue's Begin is
 * what raises the curtain and starts the device's intro.
 */
export default function LoadingScreen() {
  // How many words have been shown, counting from 0 across every pass.
  const [shown, setShown] = useState(0)
  // False for the first frame only, so even the first word fades in.
  const [entered, setEntered] = useState(false)
  const [lifting, setLifting] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (lifting) return undefined
    /*
     * The only place it decides to leave: at the boundary, as a word's turn
     * ends. Watching `sceneReady` instead would lift the moment the scene
     * arrived, cutting off whichever word was showing.
     */
    const next = setTimeout(() => {
      const saidThemAll = shown + 1 >= GREETINGS.length
      if (saidThemAll && useDeviceStore.getState().sceneReady) {
        setLifting(true)
      } else {
        setShown((n) => n + 1)
      }
    }, WORD_STEP)
    return () => clearTimeout(next)
  }, [shown, lifting])

  useEffect(() => {
    if (!lifting) return undefined
    const timer = setTimeout(() => setGone(true), LIFT_MS)
    return () => clearTimeout(timer)
  }, [lifting])

  if (gone) return null

  const active = shown % GREETINGS.length

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-100 flex items-center justify-center bg-viewport ${
        lifting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transition: `opacity ${LIFT_MS}ms ${EASE}` }}
    >
      {/*
        * Every word is on the page at once, stacked in one spot, and only the
        * active one is shown — which is what lets the outgoing word fade out
        * while the next fades in, rather than one replacing the other.
        *
        * Satoshi has no Devanagari or Japanese, so those two fall through to
        * the system's own faces — named here so they land on the good ones
        * rather than whatever the browser picks first.
        */}
      <div className="relative grid place-items-center">
        {GREETINGS.map(({ word, lang, from, to }, i) => {
          const on = entered && !lifting && i === active
          return (
            <span
              key={lang}
              lang={lang}
              aria-hidden={!on}
              data-active={on || undefined}
              className="col-start-1 row-start-1 text-4xl font-medium tracking-tight sm:text-5xl motion-reduce:!transform-none motion-reduce:!filter-none"
              style={{
                // The gradient painted through the letters and nowhere else.
                backgroundImage: `linear-gradient(100deg, ${from}, ${to})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                // Room below the baseline, so the clip keeps descenders and the
                // Devanagari matras that sit outside the line box.
                padding: '0.12em 0.04em',
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
        })}
      </div>
    </div>
  )
}
