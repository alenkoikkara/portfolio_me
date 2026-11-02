import { describe, it, expect, beforeEach } from 'vitest'
import useDeviceStore, { ABOUT_MODES, GALLERY_MODES } from './useDeviceStore'
import { PROJECTS } from '../data/projects'

const get = () => useDeviceStore.getState()
const mode = () => get().mode

/** Drive the machine into a mode the honest way, through its own transitions. */
const reach = {
  BROWSING: () => get().openCarousel(),
  INSERTING: () => { get().openCarousel(); get().insert(0) },
  PROJECTING: () => { get().openCarousel(); get().insert(0); get().seated() },
  EJECTING: () => { reach.PROJECTING(); get().eject() },
  OPENING_GALLERY: () => get().openGallery(),
  GALLERY: () => { get().openGallery(); get().galleryOpened() },
  CLOSING_GALLERY: () => { reach.GALLERY(); get().closeGallery() },
  OPENING_ABOUT: () => get().openAbout(),
  ABOUT: () => { get().openAbout(); get().aboutOpened() },
  CLOSING_ABOUT: () => { reach.ABOUT(); get().closeAbout() },
}

/** Every action, so a guard can be checked against all of them from any mode. */
const ACTIONS = [
  'openCarousel', 'closeCarousel', 'insert', 'seated', 'eject', 'ejected',
  'openGallery', 'galleryOpened', 'closeGallery', 'galleryClosed', 'goHome',
  'openAbout', 'aboutOpened', 'closeAbout', 'aboutClosed',
]

beforeEach(() => {
  useDeviceStore.setState({
    mode: 'IDLE',
    introDone: false,
    focusedIndex: 0,
    activeId: null,
    pendingIndex: null,
    focusedPhotoId: null,
    pendingHome: false,
  })
})

describe('starting state', () => {
  it('begins idle, with nothing selected and the intro unplayed', () => {
    expect(mode()).toBe('IDLE')
    expect(get().introDone).toBe(false)
    expect(get().activeId).toBeNull()
    expect(get().pendingIndex).toBeNull()
    expect(get().focusedPhotoId).toBeNull()
  })

  it('records the intro finishing', () => {
    get().markIntroDone()
    expect(get().introDone).toBe(true)
  })
})

describe('the cartridge arm', () => {
  it('opens the carousel from idle', () => {
    get().openCarousel()
    expect(mode()).toBe('BROWSING')
    expect(get().focusedIndex).toBe(0)
  })

  it('closes it again', () => {
    reach.BROWSING()
    get().closeCarousel()
    expect(mode()).toBe('IDLE')
    expect(get().activeId).toBeNull()
  })

  it('runs the full insert path, with the animation reporting each arrival', () => {
    reach.BROWSING()
    get().insert(1)
    expect(mode()).toBe('INSERTING')
    expect(get().activeId).toBe(PROJECTS[1].id)
    expect(get().focusedIndex).toBe(1)

    get().seated()
    expect(mode()).toBe('PROJECTING')

    get().eject()
    expect(mode()).toBe('EJECTING')

    get().ejected()
    expect(mode()).toBe('BROWSING')
    expect(get().activeId).toBeNull()
  })

  it('ignores an insert for a project that does not exist', () => {
    reach.BROWSING()
    get().insert(PROJECTS.length + 5)
    expect(mode()).toBe('BROWSING')
    expect(get().activeId).toBeNull()
  })
})

describe('switching projects mid-projection', () => {
  it('ejects first, then picks up the pending one', () => {
    reach.PROJECTING()
    expect(get().activeId).toBe(PROJECTS[0].id)

    get().insert(2)
    // Not a direct swap: the cartridge in the slot has to come out first.
    expect(mode()).toBe('EJECTING')
    expect(get().pendingIndex).toBe(2)
    expect(get().activeId).toBe(PROJECTS[0].id)

    get().ejected()
    expect(mode()).toBe('INSERTING')
    expect(get().activeId).toBe(PROJECTS[2].id)
    expect(get().focusedIndex).toBe(2)
    expect(get().pendingIndex).toBeNull()
  })

  it('a plain eject leaves nothing pending, so it lands back on the strip', () => {
    reach.PROJECTING()
    get().eject()
    expect(get().pendingIndex).toBeNull()
    get().ejected()
    expect(mode()).toBe('BROWSING')
  })
})

describe('focus wrapping', () => {
  it('wraps past the end and before the start', () => {
    reach.BROWSING()
    get().focus(PROJECTS.length)
    expect(get().focusedIndex).toBe(0)
    get().focus(-1)
    expect(get().focusedIndex).toBe(PROJECTS.length - 1)
    get().focus(-PROJECTS.length - 1)
    expect(get().focusedIndex).toBe(PROJECTS.length - 1)
  })

  it('can be moved while projecting, but not while idle', () => {
    reach.PROJECTING()
    get().focus(1)
    expect(get().focusedIndex).toBe(1)

    useDeviceStore.setState({ mode: 'IDLE', focusedIndex: 0 })
    get().focus(3)
    expect(get().focusedIndex).toBe(0)
  })
})

describe('the gallery arm', () => {
  it('runs open → opened → close → closed', () => {
    get().openGallery()
    expect(mode()).toBe('OPENING_GALLERY')

    get().galleryOpened()
    expect(mode()).toBe('GALLERY')

    get().closeGallery()
    expect(mode()).toBe('CLOSING_GALLERY')

    get().galleryClosed()
    expect(mode()).toBe('IDLE')
  })

  it('can be abandoned while still opening', () => {
    // The photography key is pressed and then Escape, before the fade lands.
    get().openGallery()
    get().closeGallery()
    expect(mode()).toBe('CLOSING_GALLERY')
    get().galleryClosed()
    expect(mode()).toBe('IDLE')
  })

  it('focuses a photo only once the wall is actually up', () => {
    get().openGallery()
    get().focusPhoto('img4')
    // Still opening: the camera has not changed hands yet.
    expect(get().focusedPhotoId).toBeNull()

    get().galleryOpened()
    get().focusPhoto('img4')
    expect(get().focusedPhotoId).toBe('img4')

    get().focusPhoto(null)
    expect(get().focusedPhotoId).toBeNull()
  })

  it('drops the focused photo when the gallery closes', () => {
    reach.GALLERY()
    get().focusPhoto('img7')
    get().closeGallery()
    expect(get().focusedPhotoId).toBeNull()
  })

  it('names exactly the modes in which the wall is on screen', () => {
    expect([...GALLERY_MODES].sort())
      .toEqual(['CLOSING_GALLERY', 'GALLERY', 'OPENING_GALLERY'])
  })
})

describe('the way home', () => {
  it('does nothing when already at rest', () => {
    get().goHome()
    expect(mode()).toBe('IDLE')
  })

  it('closes the carousel', () => {
    reach.BROWSING()
    get().goHome()
    expect(mode()).toBe('IDLE')
    expect(get().activeId).toBeNull()
  })

  it('ejects a seated cartridge and carries on home', () => {
    reach.PROJECTING()
    get().goHome()
    // Not a jump to rest: the cartridge has to come out of the slot first.
    expect(mode()).toBe('EJECTING')
    expect(get().pendingHome).toBe(true)

    get().ejected()
    expect(mode()).toBe('IDLE')
    expect(get().activeId).toBeNull()
    expect(get().pendingHome).toBe(false)
  })

  it('lets a cartridge in flight land, then turns it round', () => {
    reach.INSERTING()
    get().goHome()
    // Still travelling; abandoning it here would wink it out mid-air.
    expect(mode()).toBe('INSERTING')
    expect(get().pendingHome).toBe(true)

    get().seated()
    expect(mode()).toBe('EJECTING')

    get().ejected()
    expect(mode()).toBe('IDLE')
    expect(get().pendingHome).toBe(false)
  })

  it('waits out a cartridge already on its way back', () => {
    reach.EJECTING()
    get().goHome()
    expect(mode()).toBe('EJECTING')
    get().ejected()
    expect(mode()).toBe('IDLE')
  })

  it('takes precedence over a project queued behind it', () => {
    reach.PROJECTING()
    get().insert(2)
    expect(get().pendingIndex).toBe(2)

    get().goHome()
    expect(get().pendingIndex).toBeNull()
    get().ejected()
    // Home, not the project that was queued.
    expect(mode()).toBe('IDLE')
    expect(get().activeId).toBeNull()
  })

  it('closes the wall the graceful way, clearing the open print', () => {
    reach.GALLERY()
    get().focusPhoto('img4')
    get().goHome()
    expect(mode()).toBe('CLOSING_GALLERY')
    expect(get().focusedPhotoId).toBeNull()

    get().galleryClosed()
    expect(mode()).toBe('IDLE')
  })

  it('closes a wall that is still opening', () => {
    reach.OPENING_GALLERY()
    get().goHome()
    expect(mode()).toBe('CLOSING_GALLERY')
  })

  it('leaves a wall that is already closing alone', () => {
    reach.CLOSING_GALLERY()
    get().goHome()
    expect(mode()).toBe('CLOSING_GALLERY')
    get().galleryClosed()
    expect(mode()).toBe('IDLE')
  })

  it('reaches rest from every mode there is', () => {
    for (const from of ['BROWSING', 'INSERTING', 'PROJECTING', 'EJECTING',
      'OPENING_GALLERY', 'GALLERY', 'CLOSING_GALLERY']) {
      useDeviceStore.setState({ mode: 'IDLE', pendingHome: false, pendingIndex: null })
      reach[from]()
      get().goHome()
      // Let whatever was running report in, as the scene would.
      for (let i = 0; i < 4 && mode() !== 'IDLE'; i++) {
        get().seated(); get().ejected(); get().galleryOpened(); get().galleryClosed()
      }
      expect(mode(), `goHome() from ${from} must reach IDLE`).toBe('IDLE')
    }
  })

  it('does not leave the request set behind it', () => {
    reach.PROJECTING()
    get().goHome()
    get().ejected()
    expect(get().pendingHome).toBe(false)
    // A later open must not immediately bounce back home.
    get().openCarousel()
    expect(mode()).toBe('BROWSING')
    get().insert(0)
    get().seated()
    expect(mode()).toBe('PROJECTING')
  })
})

describe('the about panel', () => {
  it('runs open → opened → close → closed', () => {
    get().openAbout()
    expect(mode()).toBe('OPENING_ABOUT')
    get().aboutOpened()
    expect(mode()).toBe('ABOUT')
    get().closeAbout()
    expect(mode()).toBe('CLOSING_ABOUT')
    get().aboutClosed()
    expect(mode()).toBe('IDLE')
  })

  it('can be turned round before the camera has arrived', () => {
    // The about key pressed twice in quick succession.
    get().openAbout()
    get().closeAbout()
    expect(mode()).toBe('CLOSING_ABOUT')
    get().aboutClosed()
    expect(mode()).toBe('IDLE')
  })

  it('goes home the graceful way, from open or still opening', () => {
    for (const from of ['ABOUT', 'OPENING_ABOUT']) {
      useDeviceStore.setState({ mode: 'IDLE' })
      reach[from]()
      get().goHome()
      expect(mode(), `goHome() from ${from}`).toBe('CLOSING_ABOUT')
    }
  })

  it('leaves a panel that is already closing alone', () => {
    reach.CLOSING_ABOUT()
    get().goHome()
    expect(mode()).toBe('CLOSING_ABOUT')
  })

  it('names exactly the modes in which the about view is up', () => {
    expect([...ABOUT_MODES].sort()).toEqual(['ABOUT', 'CLOSING_ABOUT', 'OPENING_ABOUT'])
    for (const m of ABOUT_MODES) expect(GALLERY_MODES.has(m)).toBe(false)
  })
})

describe('the two arms never cross', () => {
  it('will not open the panel from anywhere but rest', () => {
    for (const from of ['BROWSING', 'INSERTING', 'PROJECTING', 'EJECTING',
      'OPENING_GALLERY', 'GALLERY', 'CLOSING_GALLERY']) {
      useDeviceStore.setState({ mode: 'IDLE', pendingHome: false, pendingIndex: null })
      reach[from]()
      get().openAbout()
      expect(mode(), `openAbout() must not fire from ${from}`).toBe(from)
    }
  })

  it('will not open the carousel or the wall while the panel is up', () => {
    // The other keys are ignored while the panel is up, by the store's guards.
    for (const from of ['OPENING_ABOUT', 'ABOUT', 'CLOSING_ABOUT']) {
      useDeviceStore.setState({ mode: 'IDLE' })
      reach[from]()
      get().openCarousel()
      get().openGallery()
      expect(mode(), `nothing else may fire from ${from}`).toBe(from)
    }
  })

  it('will not open the gallery from anywhere but idle', () => {
    for (const from of ['BROWSING', 'INSERTING', 'PROJECTING', 'EJECTING']) {
      useDeviceStore.setState({ mode: 'IDLE' })
      reach[from]()
      get().openGallery()
      expect(mode()).toBe(from)
    }
  })

  it('will not open the carousel while the wall is up', () => {
    for (const from of ['OPENING_GALLERY', 'GALLERY', 'CLOSING_GALLERY']) {
      useDeviceStore.setState({ mode: 'IDLE' })
      reach[from]()
      get().openCarousel()
      expect(mode()).toBe(from)
    }
  })
})

describe('every transition guards on the current mode', () => {
  const ALL_MODES = [
    'IDLE', 'BROWSING', 'INSERTING', 'PROJECTING', 'EJECTING',
    'OPENING_GALLERY', 'GALLERY', 'CLOSING_GALLERY',
    'OPENING_ABOUT', 'ABOUT', 'CLOSING_ABOUT',
  ]

  /** Which mode each action is allowed to move the machine out of. */
  const ALLOWED_FROM = {
    openCarousel: ['IDLE'],
    closeCarousel: ['BROWSING'],
    insert: ['BROWSING', 'PROJECTING'],
    seated: ['INSERTING'],
    eject: ['PROJECTING'],
    ejected: ['EJECTING'],
    openGallery: ['IDLE'],
    galleryOpened: ['OPENING_GALLERY'],
    closeGallery: ['GALLERY', 'OPENING_GALLERY'],
    galleryClosed: ['CLOSING_GALLERY'],
    openAbout: ['IDLE'],
    aboutOpened: ['OPENING_ABOUT'],
    closeAbout: ['ABOUT', 'OPENING_ABOUT'],
    aboutClosed: ['CLOSING_ABOUT'],
    // From INSERTING and EJECTING it records the request without moving the
    // mode, so those count as leaving it untouched.
    goHome: ['BROWSING', 'PROJECTING', 'OPENING_GALLERY', 'GALLERY', 'OPENING_ABOUT', 'ABOUT'],
  }

  it('leaves the mode untouched when called from anywhere else', () => {
    for (const action of ACTIONS) {
      for (const from of ALL_MODES) {
        if (ALLOWED_FROM[action].includes(from)) continue
        useDeviceStore.setState({
          mode: from, activeId: null, pendingIndex: null, focusedIndex: 0,
        })
        get()[action](0)
        expect(
          mode(),
          `${action}() must not fire from ${from}`,
        ).toBe(from)
      }
    }
  })

  it('an interrupted transition is abandoned rather than fighting its successor', () => {
    // Insert, then close out from under it: the late `seated` must not revive it.
    reach.BROWSING()
    get().insert(0)
    useDeviceStore.setState({ mode: 'IDLE' })
    get().seated()
    expect(mode()).toBe('IDLE')
  })
})

describe('loading', () => {
  it('records when the scene has drawn and when the greeting lifts', () => {
    useDeviceStore.setState({ sceneReady: false, curtainUp: false })
    get().markSceneReady()
    expect(get().sceneReady).toBe(true)
    expect(get().curtainUp).toBe(false)
    get().raiseCurtain()
    expect(get().curtainUp).toBe(true)
  })
})
