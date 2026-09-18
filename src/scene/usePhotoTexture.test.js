import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

/*
 * Loads are intercepted rather than performed, so a test can decide exactly
 * when an image arrives. That is the only way to observe the settle delay, the
 * queue cap and the pan gate: all three are about what happens between wanting
 * a texture and having one.
 */
const pending = []
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    TextureLoader: class {
      load(url, onLoad, _onProgress, onError) {
        pending.push({ url, onLoad, onError })
      }
    },
  }
})

/*
 * The stores are module-level singletons holding a shared in-flight counter and
 * an eviction list, so tests get a fresh module rather than trying to unwind
 * each other's state. Anything less leaks: a load left in flight never lets its
 * slot go, and the cap then starves every test that follows.
 */
let usePhotoTexture
let IMMEDIATE
let fullStore
let setPhotoRenderer
let thumbStore

/** Stands in for a decoded texture; only dispose and the fields set on it matter. */
function fakeTexture(url) {
  return { url, disposed: false, dispose() { this.disposed = true } }
}

/** Deliver the queued load for `url`, as the loader would on decode. */
function deliver(url) {
  const i = pending.findIndex((p) => p.url === url)
  if (i === -1) throw new Error(`nothing is loading ${url}`)
  const [entry] = pending.splice(i, 1)
  const texture = fakeTexture(url)
  entry.onLoad(texture)
  return texture
}

function fail(url) {
  const i = pending.findIndex((p) => p.url === url)
  const [entry] = pending.splice(i, 1)
  entry.onError(new Error('boom'))
}

const inFlight = (url) => pending.some((p) => p.url === url)

let n = 0
/** A fresh url per test, since the stores are module-level singletons. */
const url = (tag = '') => `/photos/thumb/${tag}-${n++}.webp`

/*
 * Settle both stores between tests.
 *
 * They are module-level singletons with a shared in-flight counter, and that
 * counter only comes down when a load calls back. A test that starts a load and
 * walks away would leave it high for good, and the cap would then starve every
 * test after it — so every started load is finished here, and the queue that
 * drains behind it is finished too.
 */
/** Let the coalesced pump run: loads start a microtask after they are queued. */
const flush = () => Promise.resolve()

beforeEach(async () => {
  vi.useFakeTimers()
  pending.length = 0
  vi.resetModules()
  const mod = await import('./usePhotoTexture')
  usePhotoTexture = mod.default
  IMMEDIATE = mod.IMMEDIATE
  fullStore = mod.fullStore
  thumbStore = mod.thumbStore
  setPhotoRenderer = mod.setPhotoRenderer
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the settle delay', () => {
  it('does not fetch a print the moment it is wanted', async () => {
    const u = url('settle')
    thumbStore.acquire(u, () => {})
    expect(inFlight(u)).toBe(false)
    vi.advanceTimersByTime(200)
    await flush()
    expect(inFlight(u)).toBe(true)
    thumbStore.release(u, () => {})
  })

  it('never fetches a print that was only skimmed past', async () => {
    // The whole point of the delay: a flick makes every row briefly visible.
    const u = url('skim')
    const listener = () => {}
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(50)
    await flush()
    thumbStore.release(u, listener)
    vi.advanceTimersByTime(1000)
    await flush()
    expect(inFlight(u)).toBe(false)
    expect(thumbStore.stats().resident).toBe(0)
  })

  it('lets a focused print skip the delay entirely', async () => {
    const u = url('focus')
    fullStore.acquire(u, () => {}, IMMEDIATE)
    // No timer advance at all — only the coalesced pump.
    await flush()
    expect(inFlight(u)).toBe(true)
    fullStore.release(u, () => {})
  })
})

describe('the load queue', () => {
  it('runs no more than four at once', async () => {
    const urls = Array.from({ length: 9 }, (_, i) => url(`cap${i}`))
    for (const u of urls) thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    expect(pending).toHaveLength(4)

    deliver(pending[0].url)
    expect(pending).toHaveLength(4)
    for (const u of urls) thumbStore.release(u, () => {})
  })

  it('fetches what is nearest the middle of the view first', async () => {
    const near = url('near')
    const mid = url('mid')
    const far = url('far')
    // Acquired worst-first, so order alone cannot produce the right answer.
    thumbStore.acquire(far, () => {}, { priority: 9 })
    thumbStore.acquire(mid, () => {}, { priority: 4 })
    thumbStore.acquire(near, () => {}, { priority: 0 })
    vi.advanceTimersByTime(200)
    await flush()
    expect(pending.map((p) => p.url).slice(0, 3)).toEqual([near, mid, far])
    for (const u of [near, mid, far]) thumbStore.release(u, () => {})
  })

  it('starts the next one as each finishes', async () => {
    const urls = Array.from({ length: 6 }, (_, i) => url(`drain${i}`))
    for (const u of urls) thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    const started = new Set(pending.map((p) => p.url))
    expect(started.size).toBe(4)

    deliver(pending[0].url)
    deliver(pending[0].url)
    // The two that were waiting are now in flight.
    expect(pending).toHaveLength(4)
    for (const u of urls) thumbStore.release(u, () => {})
  })

  it('keeps going after a load fails', async () => {
    const a = url('fail')
    const b = url('after')
    let sawNull = false
    thumbStore.acquire(a, (t) => { if (t === null) sawNull = true })
    thumbStore.acquire(b, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    fail(a)
    expect(sawNull).toBe(true)
    expect(inFlight(b)).toBe(true)
    thumbStore.release(a, () => {})
    thumbStore.release(b, () => {})
  })
})

describe('the pan-speed gate', () => {
  it('holds every load while the view is travelling', async () => {
    const u = url('pan')
    thumbStore.setPaused(true)
    thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(500)
    await flush()
    expect(inFlight(u)).toBe(false)
    expect(thumbStore.stats().queued).toBeGreaterThan(0)

    thumbStore.setPaused(false)
    await flush()
    expect(inFlight(u)).toBe(true)
    thumbStore.release(u, () => {})
  })

  it('costs nothing for rows the pan swept past', async () => {
    // Queued while travelling, gone before it stopped: never fetched at all.
    const u = url('swept')
    const listener = () => {}
    thumbStore.setPaused(true)
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(500)
    await flush()
    thumbStore.release(u, listener)
    thumbStore.setPaused(false)
    await flush()
    expect(inFlight(u)).toBe(false)
    expect(thumbStore.stats().resident).toBe(0)
  })
})

describe('reference counting and the grace period', () => {
  it('holds a texture while anything still wants it', async () => {
    const u = url('shared')
    const one = () => {}
    const two = () => {}
    thumbStore.acquire(u, one)
    thumbStore.acquire(u, two)
    vi.advanceTimersByTime(200)
    await flush()
    const texture = deliver(u)

    thumbStore.release(u, one)
    vi.advanceTimersByTime(10000)
    await flush()
    expect(texture.disposed).toBe(false)

    thumbStore.release(u, two)
    vi.advanceTimersByTime(10000)
    await flush()
    expect(texture.disposed).toBe(true)
  })

  it('only fetches once however many prints ask', async () => {
    const u = url('once')
    thumbStore.acquire(u, () => {})
    thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    expect(pending.filter((p) => p.url === u)).toHaveLength(1)
    thumbStore.release(u, () => {})
    thumbStore.release(u, () => {})
  })

  it('survives a print crossing the edge of the frame and coming back', async () => {
    const u = url('grace')
    const listener = () => {}
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(200)
    await flush()
    const texture = deliver(u)

    thumbStore.release(u, listener)
    vi.advanceTimersByTime(1000)
    await flush()
    // Still within grace, so panning back does not refetch.
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(10000)
    await flush()
    expect(texture.disposed).toBe(false)
    expect(inFlight(u)).toBe(false)
    thumbStore.release(u, listener)
  })

  it('drops it once the grace period has run out', async () => {
    const u = url('expire')
    const listener = () => {}
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(200)
    await flush()
    const texture = deliver(u)
    thumbStore.release(u, listener)
    vi.advanceTimersByTime(5000)
    await flush()
    expect(texture.disposed).toBe(true)
    expect(thumbStore.stats().resident).toBe(0)
  })

  it('disposes a texture that arrives after nothing wants it any more', async () => {
    const u = url('late')
    const listener = () => {}
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(200)
    await flush()
    thumbStore.release(u, listener)
    vi.advanceTimersByTime(5000)
    await flush()
    // The request outlived the need for it; it must not resurrect an entry.
    const texture = deliver(u)
    expect(texture.disposed).toBe(true)
    expect(thumbStore.stats().resident).toBe(0)
  })
})

describe('the full-resolution cap', () => {
  it('keeps the current photo and the last two, and no more', async () => {
    const urls = Array.from({ length: 5 }, (_, i) => url(`full${i}`))
    const textures = []
    for (const u of urls) {
      fullStore.acquire(u, () => {}, IMMEDIATE)
      await flush()
      textures.push(deliver(u))
      fullStore.release(u, () => {})
    }
    expect(fullStore.stats().resident).toBeLessThanOrEqual(3)
    // The oldest went; the most recent stayed.
    expect(textures[0].disposed).toBe(true)
    expect(textures[4].disposed).toBe(false)
  })

  it('evicts without spinning when the list holds a url it no longer has', async () => {
    // The hang this guards: trim() once relied on destroy to shorten the list,
    // and destroy returns early for a url it does not hold.
    const urls = Array.from({ length: 6 }, (_, i) => url(`spin${i}`))
    for (const u of urls) {
      fullStore.acquire(u, () => {}, IMMEDIATE)
      await flush()
      deliver(u)
      fullStore.release(u, () => {})
      fullStore.release(u, () => {})   // a second release must not duplicate it
    }
    expect(fullStore.stats().resident).toBeLessThanOrEqual(3)
  })
})

describe('clearing on the way out of the gallery', () => {
  it('hands back everything the caps were deliberately holding', async () => {
    const u = url('leaving')
    fullStore.acquire(u, () => {}, IMMEDIATE)
    await flush()
    const texture = deliver(u)
    fullStore.release(u, () => {})
    expect(texture.disposed).toBe(false)

    fullStore.clear()
    expect(texture.disposed).toBe(true)
    expect(fullStore.stats().resident).toBe(0)
  })

  it('leaves alone anything still referenced', async () => {
    const u = url('held')
    const listener = () => {}
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(200)
    await flush()
    const texture = deliver(u)
    thumbStore.clear()
    expect(texture.disposed).toBe(false)
    thumbStore.release(u, listener)
  })
})

describe('uploading', () => {
  it('pushes each texture to the GPU as it decodes, not on first draw', async () => {
    const initTexture = vi.fn()
    setPhotoRenderer({ initTexture })
    const u = url('upload')
    thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    const texture = deliver(u)
    expect(initTexture).toHaveBeenCalledWith(texture)
    thumbStore.release(u, () => {})
  })

  it('still works before a renderer exists', async () => {
    setPhotoRenderer(null)
    const u = url('norenderer')
    thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    expect(() => deliver(u)).not.toThrow()
    thumbStore.release(u, () => {})
  })
})

describe('usePhotoTexture', () => {
  it('returns nothing until the image arrives, then the texture', async () => {
    vi.useRealTimers()
    const u = url('hook')
    const { result } = renderHook(() => usePhotoTexture(thumbStore, u, true))
    expect(result.current).toBeNull()

    await waitFor(() => expect(inFlight(u)).toBe(true))
    const texture = await act(async () => deliver(u))
    await waitFor(() => expect(result.current).toBe(texture))
  })

  it('asks for nothing while the print is out of frame', async () => {
    const u = url('unwanted')
    const { result } = renderHook(() => usePhotoTexture(thumbStore, u, false))
    vi.advanceTimersByTime(1000)
    await flush()
    expect(result.current).toBeNull()
    expect(inFlight(u)).toBe(false)
  })

  it('passes the priority it is given through to the queue', async () => {
    vi.useRealTimers()
    const near = url('hookNear')
    const far = url('hookFar')
    thumbStore.setPaused(true)
    renderHook(() => usePhotoTexture(thumbStore, far, true, { priority: 9 }))
    renderHook(() => usePhotoTexture(thumbStore, near, true, { priority: 0 }))
    await new Promise((r) => setTimeout(r, 200))
    thumbStore.setPaused(false)
    await flush()
    expect(pending[0].url).toBe(near)
  })

  it('reports nothing when the image fails to load', async () => {
    vi.useRealTimers()
    const u = url('hookfail')
    const { result } = renderHook(() => usePhotoTexture(thumbStore, u, true))
    await waitFor(() => expect(inFlight(u)).toBe(true))
    await act(async () => { fail(u) })
    expect(result.current).toBeNull()
  })

  it('handles a missing url', async () => {
    const { result } = renderHook(() => usePhotoTexture(thumbStore, undefined, true))
    expect(result.current).toBeNull()
  })

  it('never hands back the outgoing texture after the url changes', async () => {
    // A texture returned for the wrong url would be re-uploaded after disposal.
    vi.useRealTimers()
    const first = url('swapA')
    const second = url('swapB')
    const { result, rerender } = renderHook(
      ({ u }) => usePhotoTexture(thumbStore, u, true),
      { initialProps: { u: first } },
    )
    await waitFor(() => expect(inFlight(first)).toBe(true))
    const a = await act(async () => deliver(first))
    await waitFor(() => expect(result.current).toBe(a))

    rerender({ u: second })
    // The new texture has not arrived; the old one must not stand in for it.
    expect(result.current).not.toBe(a)
    expect(result.current).toBeNull()
  })

  it('releases its hold when the print unmounts', async () => {
    vi.useRealTimers()
    const u = url('unmount')
    const { unmount } = renderHook(() => usePhotoTexture(thumbStore, u, true))
    await waitFor(() => expect(inFlight(u)).toBe(true))
    const texture = await act(async () => deliver(u))
    unmount()
    thumbStore.clear()
    expect(texture.disposed).toBe(true)
  })
})

describe('guards against being driven wrongly', () => {
  it('ignores a release for something it never held', async () => {
    expect(() => thumbStore.release('/photos/thumb/never.webp', () => {})).not.toThrow()
    expect(thumbStore.stats().resident).toBe(0)
  })

  it('ignores a pause that changes nothing', async () => {
    thumbStore.setPaused(false)
    const u = url('nochange')
    thumbStore.acquire(u, () => {})
    vi.advanceTimersByTime(200)
    await flush()
    // Setting the same value again must not re-pump or disturb anything.
    thumbStore.setPaused(false)
    expect(inFlight(u)).toBe(true)
    thumbStore.release(u, () => {})
  })

  it('says nothing to a listener when a load fails after being dropped', async () => {
    const u = url('abortfail')
    let told = false
    const listener = () => { told = true }
    thumbStore.acquire(u, listener)
    vi.advanceTimersByTime(200)
    await flush()
    thumbStore.release(u, listener)
    vi.advanceTimersByTime(10000)
    fail(u)
    expect(told).toBe(false)
  })
})

describe('stats', () => {
  it('reports what is resident, waiting and in flight', async () => {
    const a = url('statsA')
    const b = url('statsB')
    thumbStore.acquire(a, () => {})
    thumbStore.acquire(b, () => {})
    expect(thumbStore.stats().settling).toBe(2)

    vi.advanceTimersByTime(200)

    await flush()
    expect(thumbStore.stats().inFlight).toBe(2)
    expect(thumbStore.stats().paused).toBe(false)

    deliver(a)
    expect(thumbStore.stats().loaded).toBe(1)
    expect(thumbStore.stats().urls).toContain(a)
    thumbStore.release(a, () => {})
    thumbStore.release(b, () => {})
  })
})
