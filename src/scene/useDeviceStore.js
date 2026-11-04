import { create } from 'zustand'
import { PROJECTS } from '../data/projects'

/**
 * State machine for the HiChord cartridge carousel.
 *
 * Modes:
 *   IDLE       → device at rest, no cartridges
 *   BROWSING   → carousel visible, user picking a cartridge
 *   INSERTING  → cartridge flying into slot
 *   PROJECTING → cartridge seated, projector showing project info
 *   EJECTING   → cartridge flying back to carousel
 *
 * Transitions:
 *   IDLE       → BROWSING   (openCarousel)
 *   BROWSING   → IDLE       (closeCarousel / Escape)
 *   BROWSING   → INSERTING  (insert)
 *   INSERTING  → PROJECTING (seated — called by animation completion)
 *   PROJECTING → EJECTING   (eject)
 *   EJECTING   → BROWSING   (ejected — called by animation completion)
 *   EJECTING   → INSERTING  (ejected when pendingIndex is set)
 *
 * The photography key runs a second, parallel arm of the machine:
 *
 *   IDLE            → OPENING_GALLERY (openGallery)
 *   OPENING_GALLERY → GALLERY         (galleryOpened — the device fade reports in)
 *   GALLERY         → CLOSING_GALLERY (closeGallery)
 *   CLOSING_GALLERY → IDLE            (galleryClosed — the wall reports in)
 *
 * The two transitional modes are not cosmetic. The gallery has its own camera,
 * and swapping which camera is default is a cut, not a glide — so both cuts are
 * arranged to land on an empty frame of a single colour, which the desk and the
 * wall share. Nothing is ever seen changing.
 *
 * OPENING_GALLERY is the beat where the device fades out and the stage dims
 * together, while the wall — mounted but five metres behind and out of frame —
 * gets its textures on the wire. The device's fade is what calls galleryOpened,
 * so the camera cannot change hands while the desk is still on screen. The
 * prints then come up into the empty frame the cut landed on.
 *
 * CLOSING_GALLERY is the reverse: the prints clear first, with the camera still
 * on the wall, and only then does it hand back to a desk that is still faded
 * out. The device and the room come up together on IDLE.
 */
/** Modes in which the photography wall is on screen and owns the camera. */
export const GALLERY_MODES = new Set(['OPENING_GALLERY', 'GALLERY', 'CLOSING_GALLERY'])

/*
 * The about key runs a third arm:
 *
 *   IDLE          → OPENING_ABOUT (openAbout)
 *   OPENING_ABOUT → ABOUT         (aboutOpened — the camera reports in)
 *   ABOUT         → CLOSING_ABOUT (closeAbout)
 *   CLOSING_ABOUT → IDLE          (aboutClosed — the camera reports in)
 *
 * The room goes to night — the dark stage, the lights down — while the view
 * slides aside for a bio column and a constellation of milestones draws itself
 * across the dark. The camera keeps the rest view's orientation throughout.
 */
/*
 * And the contact key a fourth, the simplest:
 *
 *   IDLE    → CONTACT (openContact)
 *   CONTACT → IDLE    (closeContact)
 */

/** Modes in which the about view is up, or on its way in or out. */
export const ABOUT_MODES = new Set(['OPENING_ABOUT', 'ABOUT', 'CLOSING_ABOUT'])

const useDeviceStore = create((set, get) => ({
  mode: 'IDLE',
  // True once the device has drawn its first frame — models loaded and its
  // shaders linked — which is what the loading screen waits on.
  sceneReady: false,
  // True once the visitor has begun — the Prologue's Begin, or a deep link
  // straight into a chapter. The intro holds on its first frame until then,
  // so the fly-in is never spent behind the greeting or the Prologue.
  curtainUp: false,
  // True when the intro should jump to its end rather than play: a click
  // during the sunrise, a returning visitor, reduced motion, or a deep link.
  introSkipped: false,
  // True once the opening animation has played out and the device is at rest.
  introDone: false,
  focusedIndex: 0,
  activeId: null,
  pendingIndex: null,
  /** Photo filling the frame on the photography wall, by id. */
  focusedPhotoId: null,
  /**
   * Set when the visitor asked for the way out mid-animation.
   *
   * There is no transition from a cartridge in flight straight to rest, so the
   * request is remembered and the animation that is already running carries it
   * the rest of the way — the same shape as `pendingIndex`.
   */
  pendingHome: false,

  markSceneReady: () => set({ sceneReady: true }),
  raiseCurtain: () => set({ curtainUp: true }),
  skipIntro: () => set({ introSkipped: true }),
  markIntroDone: () => set({ introDone: true }),

  openCarousel: () => {
    const { mode } = get()
    if (mode !== 'IDLE') return
    set({ mode: 'BROWSING', focusedIndex: 0, activeId: null, pendingIndex: null, pendingHome: false })
  },

  closeCarousel: () => {
    const { mode } = get()
    if (mode !== 'BROWSING') return
    set({ mode: 'IDLE', activeId: null, pendingIndex: null, pendingHome: false })
  },

  focus: (index) => {
    const { mode } = get()
    if (mode !== 'BROWSING' && mode !== 'PROJECTING') return
    const n = PROJECTS.length
    // Wrap around: after the last cartridge the first one comes next
    const wrapped = ((index % n) + n) % n
    set({ focusedIndex: wrapped })
  },

  insert: (index) => {
    const { mode } = get()
    if (mode === 'PROJECTING') {
      // Eject current, then insert the new one
      set({ mode: 'EJECTING', pendingIndex: index })
      return
    }
    if (mode !== 'BROWSING') return
    const project = PROJECTS[index]
    if (!project) return
    set({ mode: 'INSERTING', activeId: project.id, focusedIndex: index, pendingIndex: null })
  },

  /** Called by insertion animation on completion */
  seated: () => {
    const { mode, pendingHome } = get()
    if (mode !== 'INSERTING') return
    // Asked for the way out while this was still flying in: let it land, then
    // send it straight back rather than abandoning it in the slot.
    if (pendingHome) {
      set({ mode: 'EJECTING', pendingIndex: null })
      return
    }
    set({ mode: 'PROJECTING' })
  },

  eject: () => {
    const { mode } = get()
    if (mode !== 'PROJECTING') return
    set({ mode: 'EJECTING', pendingIndex: null })
  },

  /**
   * The way back to the start, from wherever the visitor is.
   *
   * It routes through the exits that already exist rather than slamming the
   * mode to IDLE: a cartridge halfway to the slot would otherwise wink out of
   * existence, and the wall would cut away instead of clearing. Where there is
   * nothing to unwind it is immediate; where something is travelling it is
   * remembered and the running animation reports it the rest of the way.
   */
  goHome: () => {
    const { mode } = get()
    if (mode === 'IDLE') return

    if (GALLERY_MODES.has(mode)) {
      // CLOSING_GALLERY is already on its way; leave it be.
      if (mode !== 'CLOSING_GALLERY') set({ mode: 'CLOSING_GALLERY', focusedPhotoId: null })
      return
    }

    if (ABOUT_MODES.has(mode)) {
      // Already on its way back if closing; otherwise take the normal exit.
      if (mode !== 'CLOSING_ABOUT') set({ mode: 'CLOSING_ABOUT' })
      return
    }

    if (mode === 'BROWSING') {
      set({ mode: 'IDLE', activeId: null, pendingIndex: null, pendingHome: false })
      return
    }

    if (mode === 'CONTACT') {
      set({ mode: 'IDLE' })
      return
    }

    if (mode === 'PROJECTING') {
      set({ mode: 'EJECTING', pendingIndex: null, pendingHome: true })
      return
    }

    // INSERTING or EJECTING: something is in flight, so let it finish and hand
    // the request on rather than cutting it short.
    set({ pendingIndex: null, pendingHome: true })
  },

  /* ─── Contact ─── */

  /*
   * One mode, no transitional ones: the contact panel is DOM over the device at
   * rest, and fades in CSS. Nothing in the scene moves, so nothing has to
   * report that it has arrived.
   */
  openContact: () => {
    if (get().mode !== 'IDLE') return
    set({ mode: 'CONTACT' })
  },

  closeContact: () => {
    if (get().mode !== 'CONTACT') return
    set({ mode: 'IDLE' })
  },

  /*
   * A key pressed by the music rather than the visitor: the song plays the
   * keys of the chapters in the order they were visited. Only the press is
   * animated — nothing opens. `at` makes a second press of the same key a
   * change the key can see.
   */
  pressedKey: null,
  pressKey: (name) => set({ pressedKey: { name, at: performance.now() } }),

  /* ─── About panel ─── */

  openAbout: () => {
    const { mode } = get()
    if (mode !== 'IDLE') return
    set({ mode: 'OPENING_ABOUT' })
  },

  /** Called by the camera once it has slid across to make room for the panel. */
  aboutOpened: () => {
    const { mode } = get()
    if (mode !== 'OPENING_ABOUT') return
    set({ mode: 'ABOUT' })
  },

  // From OPENING_ABOUT too, so the key pressed twice in quick succession turns
  // the view round mid-slide rather than being ignored.
  closeAbout: () => {
    const { mode } = get()
    if (mode !== 'ABOUT' && mode !== 'OPENING_ABOUT') return
    set({ mode: 'CLOSING_ABOUT' })
  },

  /** Called by the camera once it is back at rest. */
  aboutClosed: () => {
    const { mode } = get()
    if (mode !== 'CLOSING_ABOUT') return
    set({ mode: 'IDLE' })
  },

  /* ─── Photography wall ─── */

  openGallery: () => {
    const { mode } = get()
    if (mode !== 'IDLE') return
    set({ mode: 'OPENING_GALLERY', focusedPhotoId: null, pendingHome: false })
  },

  /** Called by the wall once it has dimmed in and its first textures are up. */
  galleryOpened: () => {
    const { mode } = get()
    if (mode !== 'OPENING_GALLERY') return
    set({ mode: 'GALLERY' })
  },

  closeGallery: () => {
    const { mode } = get()
    if (mode !== 'GALLERY' && mode !== 'OPENING_GALLERY') return
    set({ mode: 'CLOSING_GALLERY', focusedPhotoId: null })
  },

  /** Called by the wall once it has faded back out. */
  galleryClosed: () => {
    const { mode } = get()
    if (mode !== 'CLOSING_GALLERY') return
    set({ mode: 'IDLE' })
  },

  /** Fly one print to full frame, or pass null to send it back to the wall. */
  focusPhoto: (id) => {
    const { mode } = get()
    if (mode !== 'GALLERY') return
    set({ focusedPhotoId: id })
  },

  /** Called by ejection animation on completion */
  ejected: () => {
    const { mode, pendingIndex, pendingHome } = get()
    if (mode !== 'EJECTING') return

    // The way out wins over anything queued behind it.
    if (pendingHome) {
      set({ mode: 'IDLE', activeId: null, pendingIndex: null, pendingHome: false })
      return
    }

    if (pendingIndex !== null) {
      // Immediately insert the pending cartridge
      const project = PROJECTS[pendingIndex]
      set({
        mode: 'INSERTING',
        activeId: project.id,
        focusedIndex: pendingIndex,
        pendingIndex: null,
      })
    } else {
      set({ mode: 'BROWSING', activeId: null })
    }
  },
}))

// Exposed in development so the scene can be driven from the console.
if (import.meta.env.DEV) window.deviceStore = useDeviceStore

export default useDeviceStore
