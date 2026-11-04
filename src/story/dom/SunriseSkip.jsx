import React, { useEffect, useState } from 'react'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { skipSunrise } from '../navigate'

/** How long the skip hint shows once the sun starts coming up, in ms. */
const SKIP_HINT_MS = 2400

/**
 * While the first sunrise plays — the loader starts it as it lifts — any click
 * or key lands it: the sun at 08:10 and the device at rest, because nothing
 * here is unskippable. A quiet hint says so for the first moments.
 */
export default function SunriseSkip() {
  const started = useStoryStore((s) => s.started)
  const introDone = useDeviceStore((s) => s.introDone)
  const [hintGone, setHintGone] = useState(false)

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

  if (!started || introDone) return null
  return (
    <p className={`sunrise-skip ${hintGone ? 'sunrise-skip--gone' : ''}`} aria-live="polite">
      click anywhere to skip
    </p>
  )
}
