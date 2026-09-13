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

const useDeviceStore = create((set, get) => ({
  mode: 'IDLE',
  // True once the opening animation has played out and the device is at rest.
  introDone: false,
  focusedIndex: 0,
  activeId: null,
  pendingIndex: null,
  /** Photo filling the frame on the photography wall, by id. */
  focusedPhotoId: null,

  markIntroDone: () => set({ introDone: true }),

  openCarousel: () => {
    const { mode } = get()
    if (mode !== 'IDLE') return
    set({ mode: 'BROWSING', focusedIndex: 0, activeId: null, pendingIndex: null })
  },

  closeCarousel: () => {
    const { mode } = get()
    if (mode !== 'BROWSING') return
    set({ mode: 'IDLE', activeId: null, pendingIndex: null })
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
    const { mode } = get()
    if (mode !== 'INSERTING') return
    set({ mode: 'PROJECTING' })
  },

  eject: () => {
    const { mode } = get()
    if (mode !== 'PROJECTING') return
    set({ mode: 'EJECTING', pendingIndex: null })
  },

  /* ─── Photography wall ─── */

  openGallery: () => {
    const { mode } = get()
    if (mode !== 'IDLE') return
    set({ mode: 'OPENING_GALLERY', focusedPhotoId: null })
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
    const { mode, pendingIndex } = get()
    if (mode !== 'EJECTING') return

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
