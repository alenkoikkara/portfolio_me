import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from './useStoryStore'
import { chapterForMode, chapterFromPath } from './chapters'

/** How each chapter is opened: through the device's own actions, as its key would. */
const OPEN = {
  projects: () => useDeviceStore.getState().openCarousel(),
  photography: () => useDeviceStore.getState().openGallery(),
  about: () => useDeviceStore.getState().openAbout(),
  contact: () => useDeviceStore.getState().openContact(),
}

// The wait for rest before an open, if one is outstanding.
let pending = null

function cancelPending() {
  pending?.()
  pending = null
}

/**
 * Open a chapter from wherever the device is.
 *
 * The device only opens a section from rest — every transition guards on its
 * mode — so from anywhere else this sends it home first, through the exits
 * that already exist (`goHome`), and opens the chapter once it arrives. A
 * second request before then replaces the first.
 */
export function openChapter(chapter) {
  const open = OPEN[chapter]
  if (!open) return
  cancelPending()
  const { mode, goHome } = useDeviceStore.getState()
  if (chapterForMode(mode) === chapter) return
  if (mode === 'IDLE') {
    open()
    return
  }
  goHome()
  pending = useDeviceStore.subscribe((s) => {
    if (s.mode !== 'IDLE') return
    cancelPending()
    open()
  })
}

/** Back to the device from wherever it is. */
export function goHomeChapter() {
  cancelPending()
  useDeviceStore.getState().goHome()
}

/** Whether a chapter has a section to open yet. */
export function canOpenChapter(chapter) {
  return chapter in OPEN
}

/**
 * The day begins, as the greeting lifts: the sun comes up and the device
 * assembles in it. A returning visitor, or one who asked for less motion, gets
 * the quick sunrise with the device already assembled.
 */
export function beginDay() {
  if (useStoryStore.getState().started) return
  const quick = useStoryStore.getState().begin()
  const device = useDeviceStore.getState()
  device.raiseCurtain()
  if (quick) device.skipIntro()
}

/** A click during the sunrise: the sun lands and the device finishes assembling, now. */
export function skipSunrise() {
  useStoryStore.getState().skipTravel()
  useDeviceStore.getState().skipIntro()
}

/**
 * A chapter's address loaded cold: no sunrise and no intro —
 * straight into the chapter at its hour. Returns whether the address was one.
 */
export function startFromAddress(path) {
  const chapter = chapterFromPath(path)
  if (!chapter || !canOpenChapter(chapter)) return false
  useStoryStore.getState().startAt(chapter)
  const device = useDeviceStore.getState()
  device.raiseCurtain()
  device.skipIntro()
  openChapter(chapter)
  return true
}
