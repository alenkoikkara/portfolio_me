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
 */
const useDeviceStore = create((set, get) => ({
  mode: 'IDLE',
  // True once the opening animation has played out and the device is at rest.
  introDone: false,
  focusedIndex: 0,
  activeId: null,
  pendingIndex: null,

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
