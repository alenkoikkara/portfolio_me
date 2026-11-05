/**
 * How long the device's opening takes, in seconds — from the curtain rising to
 * the last key landing, with the camera's fly-in (CAM_PATH in Device.jsx)
 * ending at rest at the same moment.
 *
 * Three seconds, where it was once nine: the clips authored in Blender run
 * ten, holding long after the last key is down, and the checklist asks for a
 * key to click within four seconds of the page. The clips are played faster
 * to fit (Device.jsx), and each key takes clicks from the moment it lands
 * rather than when the whole device has assembled.
 *
 * Shared so the story's first sunrise can last exactly as long, and the sun
 * and the device land on 08:10 together — without the story importing the
 * device's component to find out.
 */
export const INTRO_SECONDS = 3

/** How close to its final value a track must be, as a share of how far it travels, to count as landed. */
const LANDED_WITHIN = 0.01

/**
 * When a clip's part comes to rest, in the clip's own seconds: the earliest
 * moment after which every track stays within 1% of its travel from where it
 * ends. The authored clips run long and still; this is when the motion is
 * really over.
 *
 * Measured against each track's own range of motion, not its value: a key's
 * resting position is millimetres from the origin, and the compressed
 * keyframes wobble by more than 1% of that right to the clip's last frame.
 */
export function landingTime(clip) {
  let land = 0
  for (const track of clip.tracks) {
    const { times, values } = track
    const size = values.length / times.length
    const last = times.length - 1
    const tolerance = []
    for (let k = 0; k < size; k++) {
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i <= last; i++) {
        const v = values[i * size + k]
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      tolerance.push(Math.max((hi - lo) * LANDED_WITHIN, 1e-9))
    }
    const settled = (i) => {
      for (let k = 0; k < size; k++) {
        if (Math.abs(values[i * size + k] - values[last * size + k]) > tolerance[k]) return false
      }
      return true
    }
    let i = last
    while (i > 0 && settled(i - 1)) i--
    land = Math.max(land, times[i])
  }
  return land
}
