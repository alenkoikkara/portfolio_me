/**
 * How present the device is, 0..1.
 *
 * The device and the shadows it casts live in different components, and both
 * have to disappear together — a device that fades out while its contact shadow
 * stays on the desk reads as a bug rather than as a transition. Rather than
 * threading a value through props or putting it in the store, where writing it
 * every frame would re-render, the two share this one number: `Device` drives
 * it in its frame loop and `LightingSetup` reads it in the same frame.
 */
const deviceFade = { value: 1 }

export default deviceFade

// Exposed in development so the fade can be sampled while the mode changes,
// which is the only way to tell a transition that never ran from one that ran
// too fast to screenshot.
if (import.meta.env.DEV) window.__deviceFade = deviceFade
