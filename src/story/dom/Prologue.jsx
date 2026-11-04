import React, { useEffect, useState } from 'react'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { PROLOGUE_CAPTION } from '../chapters'
import { beginDay, skipSunrise } from '../navigate'

/** How long the skip hint shows once the sun starts coming up, in ms. */
const SKIP_HINT_MS = 2400

/**
 * The beginning: Chicago at 05:40, still dark, and a way in. It sits under the
 * hello greeting, which waits for the scene before it lifts, so Begin is never
 * offered before there is something to begin.
 *
 * Begin brings the sun up and the device assembles in it. Until it has, any
 * click or key skips to the end — the sun landed at 08:10 and the device at
 * rest — because nothing here is unskippable. Then the Prologue leaves the page.
 */
export default function Prologue() {
  const started = useStoryStore((s) => s.started)
  const introDone = useDeviceStore((s) => s.introDone)
  const [hintGone, setHintGone] = useState(false)

  // While the sun comes up: any click or key lands it.
  useEffect(() => {
    if (!started || introDone) return undefined
    const skip = () => skipSunrise()
    // Capture, so the click that skips does not also land on whatever is under it.
    window.addEventListener('pointerdown', skip, true)
    window.addEventListener('keydown', skip, true)
    const timer = setTimeout(() => setHintGone(true), SKIP_HINT_MS)
    return () => {
      window.removeEventListener('pointerdown', skip, true)
      window.removeEventListener('keydown', skip, true)
      clearTimeout(timer)
    }
  }, [started, introDone])

  if (started) {
    if (introDone) return null
    return (
      <p className={`prologue__skip ${hintGone ? 'prologue__skip--gone' : ''}`} aria-live="polite">
        click anywhere to skip
      </p>
    )
  }

  return (
    <div className="prologue">
      <p className="prologue__time">05:40 · chicago</p>
      <h1 className="prologue__name">alen koikkara</h1>
      <p className="prologue__caption">{PROLOGUE_CAPTION}</p>
      {/*
        * Sound is a choice made here, inside the click, because browsers start
        * audio only from a gesture; the toggle in the corner changes it later.
        */}
      <div className="prologue__actions">
        <button type="button" className="prologue__begin prologue__begin--primary" onClick={() => beginDay(true)} autoFocus>
          begin with sound
        </button>
        <button type="button" className="prologue__begin" onClick={() => beginDay(false)}>
          begin quietly
        </button>
      </div>
      {/* The horizon, just before the sun comes over it. */}
      <div className="prologue__horizon" aria-hidden="true" />
    </div>
  )
}
