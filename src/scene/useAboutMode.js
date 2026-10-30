import useDeviceStore, { ABOUT_MODES } from './useDeviceStore'

/**
 * Where the about view stands, for the pieces that appear in it.
 *
 * `inAbout` is whether they should exist at all — through the close too, so
 * they can fade out rather than vanish. `present` is whether they should be
 * showing: leaving counts as absent, so everything starts to go the moment the
 * view starts back, not once it has arrived.
 */
export default function useAboutMode() {
  const mode = useDeviceStore((s) => s.mode)
  const inAbout = ABOUT_MODES.has(mode)
  return { inAbout, present: inAbout && mode !== 'CLOSING_ABOUT' }
}
