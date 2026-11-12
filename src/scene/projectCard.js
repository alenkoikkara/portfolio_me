/**
 * A typographic title card for a project with no screenshot — Alen's own
 * engineering work is mostly APIs and pipelines, with nothing to show as a
 * page, and a made-up screenshot would be worse than none.
 *
 * Drawn once per project on a canvas and handed out as a data URL, so the
 * cartridge label and the projector load it exactly like a screenshot: the
 * same loader, the same disposal, the same scroll. Its top 4:3 is what the
 * label shows (Cartridge.jsx crops the preview to that), so the title and the
 * outcome sit there; the projector scrolls on through role, stack, timeline
 * and result.
 */

/*
 * Two scales of type. The title block is what the label shows, tiny on a
 * cartridge, so it is set large; the details below are only ever projected,
 * a slice as wide as the plane, and at that size they came up the size of a
 * billboard beside the screenshots — so they are set at half.
 */
const TYPE = 0.5
const WIDTH = 900
const HEIGHT = 1350
const PAD = 72
/** Where the label's 4:3 crop ends: the details start below it. */
const LABEL_BOTTOM = WIDTH * 0.75
const PAPER = '#faf9f6'
const INK = '#17181c'
const MUTED = '#646670'
const RULE = '#e4e2dc'
const FONT = '"Satoshi", ui-sans-serif, system-ui, sans-serif'

const cache = new Map()

/** Lines of `text` no wider than `width` at the context's current font. */
function wrap(g, text, width) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (g.measureText(next).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawCard(project) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const g = canvas.getContext('2d')
  if (!g) return null
  const inner = WIDTH - PAD * 2

  g.fillStyle = PAPER
  g.fillRect(0, 0, WIDTH, HEIGHT)
  // A band of the cartridge's own colour, so the card belongs to its shell.
  g.fillStyle = project.color
  g.fillRect(0, 0, WIDTH, 20)

  // The title block, inside the label's crop.
  let y = 150
  g.fillStyle = MUTED
  g.font = `500 30px ${FONT}`
  g.fillText(project.role.toUpperCase(), PAD, y)

  y += 110
  g.fillStyle = INK
  g.font = `500 104px ${FONT}`
  for (const line of wrap(g, project.title, inner)) {
    g.fillText(line, PAD, y)
    y += 112
  }

  y += 10
  g.fillStyle = MUTED
  g.font = `400 44px ${FONT}`
  for (const line of wrap(g, project.outcome, inner)) {
    g.fillText(line, PAD, y)
    y += 60
  }

  // Below the label's crop: the details the projector scrolls through.
  y = Math.max(y + 40, LABEL_BOTTOM + 40)
  const section = (heading, body) => {
    g.fillStyle = RULE
    g.fillRect(PAD, y, inner, 2 * TYPE)
    y += 70 * TYPE
    g.fillStyle = MUTED
    g.font = `500 ${28 * TYPE}px ${FONT}`
    g.fillText(heading.toUpperCase(), PAD, y)
    y += 64 * TYPE
    g.fillStyle = INK
    g.font = `400 ${46 * TYPE}px ${FONT}`
    for (const line of wrap(g, body, inner)) {
      g.fillText(line, PAD, y)
      y += 62 * TYPE
    }
    y += 40 * TYPE
  }
  section('Stack', project.stack.join(' · '))
  section('When', project.timeline)
  section('Result', project.result)

  return canvas.toDataURL('image/png')
}

/** The image a project shows on its label and projector: its screenshot, or its title card. */
export function previewUrl(project) {
  if (project.preview) return project.preview
  if (!cache.has(project.id)) cache.set(project.id, drawCard(project))
  return cache.get(project.id)
}
