import React, { useEffect, useRef } from 'react'
import '../story.css'
import { INK } from '../palette'

/**
 * A tile of stars, drawn once — night on a white page is a star chart printed
 * in ink. Sparse and faint on purpose: dense or dark dots on white read as
 * dust, not stars. Mostly pinpricks, a few larger; seeded, so the same sky
 * every visit.
 */
function starsDataURL(size = 1024, count = 90, seed = 7) {
  let s = seed
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return null
  g.fillStyle = INK
  for (let i = 0; i < count; i++) {
    const r = rand() < 0.9 ? 0.7 + rand() * 0.6 : 1.4 + rand() * 0.5
    g.globalAlpha = 0.12 + rand() * 0.23
    g.beginPath()
    g.arc(rand() * size, rand() * size, r, 0, Math.PI * 2)
    g.fill()
  }
  return canvas.toDataURL('image/png')
}

/**
 * The sky behind the canvas: a near-white gradient and an ink star chart, both driven by
 * CSS variables that SkyDriver.jsx writes as the hour changes, so the sky is
 * never a React render.
 *
 * The canvas is transparent, so this is what shows around the device — and
 * through the photography wall, whose backdrop no longer paints a colour of
 * its own. The veil on top is the room going dark for the projector
 * (`--stage-bg`, in index.css); everywhere else it is clear.
 */
export default function SkyBackground() {
  const starsRef = useRef()
  useEffect(() => {
    const url = starsDataURL()
    if (url && starsRef.current) starsRef.current.style.backgroundImage = `url(${url})`
  }, [])

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky__stars" ref={starsRef} />
      {/* A dashed pen line: the night L train (TrainPass.jsx) going by. */}
      <div className="sky__train" />
      <div className="sky__grain" />
      <div className="sky__veil" />
    </div>
  )
}
