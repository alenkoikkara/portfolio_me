/**
 * All sound for the scene, synthesised at runtime.
 *
 * Nothing here loads a file: every sound is built from oscillators and noise
 * buffers, so the device stays silent until the visitor does something and no
 * audio assets ship with the page.
 *
 * One AudioContext serves the whole app. Browsers cap how many a page may
 * hold, and a second one here would also mean a second volume to reason about.
 *
 * **Sound is opt-in** (`setSoundOn`): off by default, and off means fully
 * silent — every sound below asks `audio()` first, and with sound off that
 * returns null without ever creating a context.
 */

let ctx = null
let master = null
let enabled = false

/**
 * The context, created on first use. Browsers refuse to start audio before a
 * gesture, so every sound here is triggered by a click somewhere up the stack.
 * @returns {AudioContext|null} null while sound is off, or where the browser
 *   has no Web Audio at all
 */
function audio() {
  if (!enabled) return null
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

/**
 * Sound on or off, for the whole app. On creates (or wakes) the context, so
 * it must be called inside a click — Begin, or the sound toggle. Off suspends
 * it: instantly silent, a projector reel included, and resumed where it was.
 */
export function setSoundOn(on) {
  enabled = on
  if (on) audio()
  else {
    // A chord held across a mute would come back mid-sustain on unmute.
    releaseHeld()
    if (ctx && ctx.state === 'running') ctx.suspend()
  }
}

/* ─── The city ─── */

/**
 * A distant L train: brown-ish rumble, low-passed hard, swelling in and out
 * over the second and a half its light takes to cross the desk.
 */
export function playRumble() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 1.6, type: 'lowpass', frequency: 160, q: 0.7, peak: 0.35, attack: 0.6 })
}

/** A camera shutter, click-clack: two short high bursts, 70 ms apart. */
export function playShutter() {
  const c = audio()
  if (!c) return
  noiseBurst(c, { duration: 0.035, type: 'highpass', frequency: 2500, peak: 0.3 })
  setTimeout(() => {
    const again = audio()
    if (again) noiseBurst(again, { duration: 0.03, type: 'highpass', frequency: 3200, peak: 0.22 })
  }, 70)
}

/* ─── Music ─── */

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** A note's frequency in Hz, from scientific pitch: 'A4' is 440, 'F#3' and 'Bb2' work too. */
export function noteFrequency(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!match) throw new Error(`Not a note: ${name}`)
  const [, letter, accidental, octave] = match
  const semitone = NOTE_INDEX[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
  const midi = (Number(octave) + 1) * 12 + semitone
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/*
 * The room the music plays in: a soft low-pass, then a short synthetic hall —
 * an impulse response of decaying noise, built once, so no reverb file ships.
 * Wet level and decay were set by ear to sit under the experience, like a
 * café's background music, not over it.
 */
let musicBus = null
let bellBus = null
const REVERB_SECONDS = 3.2
const REVERB_WET = 0.32

function buildReverb(c) {
  const frames = Math.floor(c.sampleRate * REVERB_SECONDS)
  const impulse = c.createBuffer(2, frames, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3)
  }
  const convolver = c.createConvolver()
  convolver.buffer = impulse
  return convolver
}

function buses(c) {
  if (musicBus) return
  const reverb = buildReverb(c)
  const wet = c.createGain()
  wet.gain.value = REVERB_WET
  reverb.connect(wet)
  wet.connect(master)

  const tone = c.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1800
  tone.Q.value = 0.3
  tone.connect(master)
  tone.connect(reverb)
  musicBus = tone

  // The bells go to the reverb and the dry bus alike, unfiltered: they are
  // meant to sparkle a little above the pad.
  const bells = c.createGain()
  bells.connect(master)
  bells.connect(reverb)
  bellBus = bells
}

/*
 * One voice of the pad: a sine for the body and a sine an octave and a fifth
 * up that dies away fast, which is what reads as an electric piano's tine
 * rather than an organ. Levels per voice are small: a chord stacks five.
 */
const PAD_PEAK = 0.05
const PAD_SUSTAIN = 0.35
const PAD_RELEASE = 2.8

/**
 * One pad voice. With a `duration` it releases itself; with `null` it holds
 * at its sustain until `release` is called on what this returns.
 */
function padVoice(c, frequency, start, duration, velocity) {
  const peak = PAD_PEAK * velocity
  const body = c.createOscillator()
  body.type = 'sine'
  body.frequency.value = frequency
  const tine = c.createOscillator()
  tine.type = 'sine'
  tine.frequency.value = frequency * 3
  const tineGain = c.createGain()
  tineGain.gain.setValueAtTime(0.0001, start)
  tineGain.gain.exponentialRampToValueAtTime(0.35, start + 0.01)
  tineGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(peak, start + 0.02)
  env.gain.exponentialRampToValueAtTime(peak * PAD_SUSTAIN, start + 0.6)

  body.connect(env)
  tine.connect(tineGain)
  tineGain.connect(env)
  env.connect(musicBus)
  body.start(start)
  tine.start(start)

  const release = (at) => {
    env.gain.cancelScheduledValues(at)
    env.gain.setValueAtTime(peak * PAD_SUSTAIN, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + PAD_RELEASE)
    body.stop(at + PAD_RELEASE + 0.1)
    tine.stop(at + PAD_RELEASE + 0.1)
  }
  if (duration !== null) release(Math.max(start + 0.6, start + duration))
  return { release }
}

/**
 * A chord, strummed: each note 14 ms after the last, upper voices a touch
 * softer, held for `duration` seconds and then let ring out.
 */
export function playChord(notes, { duration = 2.4, velocity = 0.55 } = {}) {
  const c = audio()
  if (!c) return
  buses(c)
  const now = c.currentTime
  notes.forEach((note, i) => {
    padVoice(c, noteFrequency(note), now + i * 0.014, duration, Math.max(0.2, velocity - i * 0.03))
  })
}

/*
 * A chord left hanging: the contact chapter's suspended V, held until the
 * visitor reaches out (resolved home) or leaves (it simply fades).
 */
let held = null

export function holdChord(notes, { velocity = 0.45 } = {}) {
  const c = audio()
  if (!c) return
  buses(c)
  releaseHeld()
  const now = c.currentTime
  held = notes.map((note, i) => padVoice(c, noteFrequency(note), now + i * 0.014, null, velocity))
}

/** Let the held chord go — and, if given one, resolve it to another. */
export function releaseHeld(resolveTo) {
  if (held && ctx) {
    const now = ctx.currentTime
    for (const voice of held) voice.release(now)
  }
  held = null
  if (resolveTo) playChord(resolveTo, { duration: 3.6, velocity: 0.6 })
}

/*
 * A list of chords at 76 bpm, two beats each, then `home`: the visitor's own
 * walk through the site, played back and resolved. `onStep` is called as each
 * chord sounds, so the device can press the key that chord belongs to.
 * Returns a function that cancels whatever has not played yet.
 */
export const SONG_STEP_MS = (60 / 76) * 2 * 1000

export function playSong(chords, { home, onStep } = {}) {
  const timers = chords.map((chord, i) => setTimeout(() => {
    playChord(chord, { duration: 1.9 })
    onStep?.(i)
  }, i * SONG_STEP_MS))
  if (home) timers.push(setTimeout(() => playChord(home, { duration: 4, velocity: 0.6 }), chords.length * SONG_STEP_MS))
  return () => timers.forEach(clearTimeout)
}

/** A little bell, for the device's small keys. */
export function playNote(note) {
  const c = audio()
  if (!c) return
  buses(c)
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = noteFrequency(note)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, now)
  env.gain.exponentialRampToValueAtTime(0.045, now + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
  osc.connect(env)
  env.connect(bellBus)
  osc.start(now)
  osc.stop(now + 1.3)
}
