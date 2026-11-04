import React, { useEffect, useRef } from 'react'
import useStoryStore from '../useStoryStore'
import { sky } from '../sky'
import { CHAPTERS, CONTACT_RESOLVED_CAPTION, homeCaption } from '../chapters'
import { goHomeChapter } from '../navigate'
import KeyHelp from './KeyHelp'

const pad = (n) => String(n).padStart(2, '0')

/** The clock's face for an hour count: "HH:MM", and the day once it is past the first. */
export function clockFace(hours) {
  // Whole minutes, with a hair of tolerance: hours are stored as fractions, and
  // 8 + 10/60 lands a rounding error under 08:10 — the clock read 08:09.
  const minutes = Math.floor(hours * 60 + 1e-6)
  const within = ((minutes % 1440) + 1440) % 1440
  const day = Math.floor(minutes / 1440) + 1
  return {
    time: `${pad(Math.floor(within / 60))}:${pad(within % 60)}`,
    day: day > 1 ? `day ${day}` : '',
  }
}

/**
 * The story's corner: the name (which is also the way home), the clock, and the
 * chapter's title and one-line caption beneath.
 *
 * The clock reads `sky.hours` on every animation frame and writes the text
 * straight into the DOM, never through React: while the sky spins between
 * chapters the minutes visibly race, and that must not re-render anything.
 * React renders only when the chapter changes.
 *
 * The caption comes in after the light has mostly arrived (a delay in CSS),
 * so the words and the light land together.
 */
export default function StoryHUD() {
  const timeRef = useRef()
  const dayRef = useRef()
  const chapter = useStoryStore((s) => s.chapter)
  const started = useStoryStore((s) => s.started)
  const contactResolved = useStoryStore((s) => s.contactResolved)
  const soundOn = useStoryStore((s) => s.soundOn)
  const toggleSound = useStoryStore((s) => s.toggleSound)

  useEffect(() => {
    let frame = 0
    let lastTime = ''
    let lastDay = null
    const tick = () => {
      const { time, day } = clockFace(sky.hours)
      if (time !== lastTime && timeRef.current) timeRef.current.textContent = lastTime = time
      if (day !== lastDay && dayRef.current) dayRef.current.textContent = lastDay = day
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Before the day begins the greeting has the page to itself.
  if (!started) return null

  const section = CHAPTERS[chapter]
  // Contact's caption answers once the visitor has reached out.
  const caption = chapter === 'contact' && contactResolved
    ? CONTACT_RESOLVED_CAPTION
    : section ? section.caption : homeCaption(sky.hours)

  return (
    // Click-through, so it cannot swallow drags on the canvas behind it; only
    // the name, the sound toggle and the shortcuts' ? take the pointer.
    //
    // It sits on a pane of Liquid Glass drawn in the canvas (HudGlass.jsx),
    // which takes its size from this element: the padding is the glass around
    // the words, and the position is shifted out by it, so the words stay
    // where they were.
    <div
      data-hud-glass
      className="story-hud pointer-events-none absolute left-[calc(2.5rem-16px)] top-[calc(2rem-12px)] z-50 px-4 py-3"
    >
      <div className="flex items-baseline gap-3">
        <h1 className="stage-title text-xs font-bold lowercase opacity-80">
          <button
            type="button"
            onClick={goHomeChapter}
            aria-label="Back to the start"
            className="pointer-events-auto cursor-pointer lowercase transition-opacity duration-200 hover:opacity-60"
          >
            alen koikkara
          </button>
        </h1>
        <span className="story-hud__clock text-xs" aria-label="Time in Chicago">
          <span ref={timeRef} />
          <span ref={dayRef} className="story-hud__day" />
        </span>
        <button
          type="button"
          className="story-hud__sound text-xs"
          aria-pressed={soundOn}
          onClick={toggleSound}
          title="Sound (M)"
        >
          {soundOn ? 'sound on' : 'sound off'}
        </button>
        <KeyHelp />
      </div>
      <p key={`${chapter}-${contactResolved}`} className="story-hud__chapter mt-1.5 max-w-[min(70vw,360px)] text-xs">
        {section && <span className="story-hud__title">{section.title.toLowerCase()}</span>}
        <span className="story-hud__caption">{caption}</span>
      </p>
    </div>
  )
}
