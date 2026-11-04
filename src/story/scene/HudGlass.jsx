import React from 'react'
import GlassPill from '../../scene/GlassPill'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'

/*
 * The modes in which the projector's veil darkens the page. The veil is DOM
 * behind the canvas, which the glass cannot see — it composites the sky's own
 * gradient — so there it would glow as a white pane on a dark room.
 */
const VEILED = new Set(['INSERTING', 'PROJECTING', 'EJECTING'])

/** Corner radius, CSS px: a pane rather than a capsule, around two lines of text. */
const RADIUS = 14

/**
 * Liquid Glass behind the story's corner — the name, the clock and the
 * chapter's caption (StoryHUD.jsx) — once the day has begun, everywhere but
 * under the projector's veil.
 */
export default function HudGlass() {
  const started = useStoryStore((s) => s.started)
  const veiled = useDeviceStore((s) => VEILED.has(s.mode))
  return <GlassPill selector="[data-hud-glass]" show={started && !veiled} radius={RADIUS} />
}
