import React, { useEffect, useRef, useState } from 'react'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { SECTION_CHAPTERS, SECTION_KEYS, songChords, songLink } from '../chapters'
import { CHORDS, music } from '../chords'
import { playSong } from '../../scene/audio'

/** How many chords a visit is, in words: one per section. */
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']
const COUNT = NUMBERS[SECTION_CHAPTERS.length] ?? String(SECTION_CHAPTERS.length)

/**
 * The epilogue: once every chapter has been visited, home offers the
 * visit back as its chords — strummed in the order they were seen, each
 * pressing its chapter's key on the device, then resolved home to D. And a
 * link that replays it for someone else (`?song=`), whose visitor sees
 * "someone's visit" on reaching home.
 *
 * One quiet line at the bottom of home, in the chrome's own type: no card.
 */
export default function SongPrompt() {
  const chapter = useStoryStore((s) => s.chapter)
  const visited = useStoryStore((s) => s.visited)
  const shared = useStoryStore((s) => s.sharedSong)
  const soundOn = useStoryStore((s) => s.soundOn)
  const setSound = useStoryStore((s) => s.setSound)
  const pressKey = useDeviceStore((s) => s.pressKey)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)
  const cancel = useRef(null)

  // Stop a song still playing when the line goes away.
  useEffect(() => () => cancel.current?.(), [])

  const own = SECTION_CHAPTERS.every((c) => visited.includes(c))
  const song = own ? visited : shared
  if (!music.on || chapter !== 'home' || !song || dismissed) return null

  const play = () => {
    // Play is a click, so sound may be turned on here if it was off.
    if (!soundOn) setSound(true)
    cancel.current?.()
    cancel.current = playSong(songChords(song), {
      home: CHORDS.resolve,
      onStep: (i) => pressKey(SECTION_KEYS[song[i]]),
    })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(songLink(window.location.origin, song))
      setCopied(true)
    } catch {
      // No clipboard here; the song still plays, it just cannot be passed on.
    }
  }

  return (
    <div className="song" role="status">
      <span>{own ? `your visit, in ${COUNT} chords` : `someone’s visit, in ${COUNT} chords`}</span>
      <button type="button" onClick={play}>play</button>
      {own && <button type="button" onClick={copy}>{copied ? 'copied' : 'copy link'}</button>}
      <button type="button" aria-label="Dismiss" onClick={() => { cancel.current?.(); setDismissed(true) }}>×</button>
    </div>
  )
}
