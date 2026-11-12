/**
 * Whether the story's music plays: each chapter's chord, Contact's held one
 * and its resolution, the sunrise's, the small keys' notes and the epilogue's
 * song. Off for the Awwwards submission, whose checklist cuts them — judged
 * work must be live and nothing unjudged should ship switched on — but kept,
 * to come back as an update after judging. An object rather than a constant
 * so the tests can switch it on and keep all of it working meanwhile. Key
 * clicks, the projector, the shutter and the train are not music and play
 * whenever sound is on.
 */
export const music = { on: false }

/**
 * The chords of the day, in D major. Each chapter's chord shares common tones
 * (F#, A, D) with the others, so any order a visitor walks the site in voice-
 * leads smoothly: there is no wrong song.
 *
 * Note names are scientific pitch (A4 = 440 Hz). If a bass note vanishes on
 * laptop speakers, raise the first note of a chord an octave.
 */
export const CHORDS = {
  sunrise: ['D2', 'A2', 'E3', 'F#3', 'A3'], // Dadd9 — the sun comes up
  projects: ['D2', 'F#3', 'A3', 'C#4', 'E4'], // Dmaj9 (I) — bright, midday
  photography: ['B1', 'F#3', 'A3', 'D4'], // Bm7 (vi) — warm, a little wistful
  about: ['G1', 'F#3', 'B3', 'D4'], // Gmaj7 (IV) — dreamy, night
  contactSus: ['A1', 'G3', 'B3', 'D4'], // A9sus4 (V) — a question, left hanging
  resolve: ['D2', 'F#3', 'A3', 'E4'], // Dadd9 (I) — the answer
}

/**
 * The device's small keys, left to right on the top row and the explode key —
 * D major pentatonic, so however they are pressed they cannot sound wrong.
 */
export const GRACE_NOTES = {
  Btn_LI: 'D5',
  Btn_GH: 'E5',
  Btn_MD: 'F#5',
  Key_Bot_0: 'A5',
}
