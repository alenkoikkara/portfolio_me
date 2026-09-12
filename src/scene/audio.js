/**
 * All sound for the scene, synthesised at runtime.
 *
 * Nothing here loads a file: every sound is built from oscillators and noise
 * buffers, so the device stays silent until the visitor does something and no
 * audio assets ship with the page.
 *
 * One AudioContext serves the whole app. Browsers cap how many a page may
 * hold, and a second one here would also mean a second volume to reason about.
 */

let ctx = null
let master = null

/**
 * The context, created on first use. Browsers refuse to start audio before a
 * gesture, so every sound here is triggered by a click somewhere up the stack.
 * @returns {AudioContext|null} null where the browser has no Web Audio at all
 */
function audio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  // Published for development only, so a meter can find the live bus no matter
  // which module instance created it.
  if (import.meta.env.DEV) window.__audioCtx = ctx
  master = ctx.createGain()
  master.gain.value = 1
  if (import.meta.env.DEV) window.__audioBus = master
  master.connect(ctx.destination)
  return ctx
}

/**
 * A burst of noise, shaped by a filter and an envelope. The raw material for
 * every mechanical sound here: plastic sliding, a latch closing, a shutter.
 */
/*
 * `peak` is the level after filtering, not the level of the raw noise. A
 * narrow bandpass discards most of the broadband energy, so these numbers run
 * far higher than they look and were set by metering the master bus.
 */
function noiseBurst(c, { duration, type, frequency, q = 1, peak, attack = 0.002, sweepTo }) {
  const frames = Math.max(1, Math.floor(c.sampleRate * duration))
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

  const src = c.createBufferSource()
  src.buffer = buffer

  const filter = c.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  const now = c.currentTime
  filter.frequency.setValueAtTime(frequency, now)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration)

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  src.start(now)
  src.stop(now + duration)
  return src
}

/** A pitched thud: the body of a latch, a seat, a bottom-out. */
function thud(c, { frequency, drop, duration, peak, delay = 0 }) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  const now = c.currentTime + delay
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, now)
  osc.frequency.exponentialRampToValueAtTime(drop, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + duration)
}

/* ─── Keys ─── */

/** The tactile snap and thock of a keycap bottoming out. */
export function playMechanicalClick() {
  const c = audio()
  if (!c) return
  const time = c.currentTime

  const clickOsc = c.createOscillator()
  const clickGain = c.createGain()
  clickOsc.type = 'square'
  clickOsc.frequency.setValueAtTime(2500 + (Math.random() * 800 - 400), time)
  clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02)
  clickGain.gain.setValueAtTime(0.08, time)
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02)
  clickOsc.connect(clickGain)
  clickGain.connect(master)
  clickOsc.start(time)
  clickOsc.stop(time + 0.02)

  thud(c, { frequency: 300 + (Math.random() * 40 - 20), drop: 50, duration: 0.08, peak: 0.5, delay: 0.01 })
}

/* ─── Cartridge ─── */

/**
 * The cartridge leaving the strip: a short airy sweep as it is picked up.
 */
export function playCartridgeLift() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 0.26, type: 'bandpass', frequency: 500, sweepTo: 1700, q: 1.1, peak: 0.34, attack: 0.06 })
}

/**
 * Plastic running along the guides of the slot. Falling filter, because the
 * sound closes in as the cartridge disappears into the housing.
 */
export function playCartridgeSlide() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 0.2, type: 'bandpass', frequency: 2400, sweepTo: 700, q: 2.2, peak: 0.46, attack: 0.02 })
}

/**
 * The detent: the cartridge dropping onto its seat. A hard edge over a low
 * body, which is what makes the 1 mm overshoot in the animation read as
 * mechanical rather than as the cartridge merely arriving.
 */
export function playCartridgeSeat() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 0.05, type: 'highpass', frequency: 2600, peak: 0.26, attack: 0.001 })
  thud(c, { frequency: 190, drop: 55, duration: 0.14, peak: 0.42 })
}

/** The latch letting go, on the way back out. Softer than seating. */
export function playCartridgeRelease() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 0.04, type: 'highpass', frequency: 1900, peak: 0.16, attack: 0.001 })
  thud(c, { frequency: 140, drop: 60, duration: 0.1, peak: 0.24 })
  noiseBurst(c, { duration: 0.22, type: 'bandpass', frequency: 900, sweepTo: 1800, q: 1.4, peak: 0.3, attack: 0.05 })
}

/* ─── Projector ─── */

let reel = null

/**
 * One second of a running projector, built so it loops without a seam.
 *
 * The hum uses whole numbers of cycles per second and the shutter ticks land
 * on exact divisions of the buffer, so the end meets the start cleanly. The
 * hiss is noise, where a join is just another random step and inaudible.
 */
function buildReelBuffer(c) {
  const sampleRate = c.sampleRate
  const frames = sampleRate
  const buffer = c.createBuffer(1, frames, sampleRate)
  const data = buffer.getChannelData(0)

  // Motor, at mains-ish frequencies an old projector would sit on.
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate
    data[i] =
      Math.sin(2 * Math.PI * 24 * t) * 0.035 +
      Math.sin(2 * Math.PI * 48 * t) * 0.05 +
      Math.sin(2 * Math.PI * 96 * t) * 0.018
  }

  // The gate, pulling one frame at a time: 24 of them a second.
  const ticks = 24
  const tickFrames = Math.floor(sampleRate * 0.007)
  for (let k = 0; k < ticks; k++) {
    const start = Math.round((k / ticks) * frames)
    for (let i = 0; i < tickFrames; i++) {
      const env = Math.exp(-i / (tickFrames * 0.3))
      data[(start + i) % frames] += (Math.random() * 2 - 1) * env * 0.16
    }
  }

  // Lamp housing air.
  let lowpassed = 0
  for (let i = 0; i < frames; i++) {
    lowpassed += (Math.random() * 2 - 1 - lowpassed) * 0.12
    data[i] += lowpassed * 0.05
  }

  return buffer
}

/**
 * Spin the projector up. Safe to call repeatedly; only the first call while
 * running has any effect.
 */
export function startProjector() {
  const c = audio()
  if (!c || reel) return

  const source = c.createBufferSource()
  source.buffer = buildReelBuffer(c)
  source.loop = true
  // A touch off nominal speed each time, so repeat viewings never sound canned.
  source.playbackRate.value = 0.97 + Math.random() * 0.06

  // Slow drift across the tone, standing in for the wow and flutter of a belt.
  const tone = c.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1900
  tone.Q.value = 0.6

  const wow = c.createOscillator()
  const wowDepth = c.createGain()
  wow.frequency.value = 0.17
  wowDepth.gain.value = 260
  wow.connect(wowDepth)
  wowDepth.connect(tone.frequency)

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.gain.linearRampToValueAtTime(1, c.currentTime + 0.45)

  source.connect(tone)
  tone.connect(gain)
  gain.connect(master)
  source.start()
  wow.start()

  reel = { source, gain, wow }
}

/** Wind the projector down and release its nodes. */
export function stopProjector() {
  if (!reel || !ctx) return
  const { source, gain, wow } = reel
  reel = null
  const end = ctx.currentTime + 0.35
  gain.gain.cancelScheduledValues(ctx.currentTime)
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.0001, end)
  source.stop(end)
  wow.stop(end)
}
