import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Shared, reference-counted texture stores for the photography wall.
 *
 * Photo textures are this scene's memory cost, the same way preview screenshots
 * are the projector's: an 800 px thumbnail is a few megabytes of VRAM once
 * decoded, so a wall of two hundred of them would be hundreds of megabytes if
 * they were all resident. Only what the camera can see is held.
 *
 * Two stores, because the two sizes are wanted for different reasons:
 *
 *   thumbs — held while the print is in frame, then dropped after a grace
 *            period. The grace is what stops a print that is being panned back
 *            and forth across the edge of the frame from reloading every time
 *            it crosses; without it, a small pan re-flickers the whole column.
 *
 *   full   — held for the print being viewed full-frame, capped at three by
 *            least-recently-used. Stepping back through the last couple of
 *            photos is instant; going further reloads, which is the right
 *            trade because a 2000 px image is several times a thumbnail.
 *
 * Wanting a texture is not the same as fetching one. Between the two sit a
 * settle delay and a bounded queue, which is what keeps the wall from asking
 * for everything at once:
 *
 *   settle — a print must stay wanted for a moment before its load starts. A
 *            flick that sweeps the length of the wall makes every print it
 *            passes briefly visible, and without this each one would be
 *            requested and then immediately thrown away. Nothing is fetched for
 *            a print the viewer only skimmed past.
 *
 *   queue  — only a few loads run at once, nearest the middle of the view
 *            first. Opening the gallery makes a dozen prints visible in the
 *            same frame; firing all of them together makes each one arrive
 *            later than if they had been taken a few at a time, and the ones
 *            being looked at arrive last. The rest wait their turn and fill in.
 *
 * A texture is handed back only while it matches the url being asked for. On a
 * fast swap the url changes a render before the new texture arrives, and
 * returning the outgoing one would let the renderer re-upload it after the last
 * reference had gone, stranding a GPU texture nothing owns.
 */

/** How long a thumbnail survives after its print leaves the frame, in ms. */
const THUMB_GRACE_MS = 4000
/** Concurrent full-resolution textures: the one on screen plus the last two. */
const FULL_LIMIT = 3
/** Clamped by the renderer against the driver's maximum on upload. */
const ANISOTROPY = 8

/*
 * The renderer, so a texture can be pushed to the GPU the moment it decodes.
 *
 * Loading an image is not the same as uploading it: three defers the upload to
 * the first frame that draws the texture, which for the wall is the single frame
 * the gallery camera takes over. Fifteen thumbnails uploading and building their
 * mipmaps in that one frame is the stutter you see on opening. Doing each one as
 * it arrives spreads the same work across the beat before the cut, where there is
 * nothing else happening.
 */
let renderer = null
export function setPhotoRenderer(gl) {
  renderer = gl
}
/**
 * Loads allowed in flight at once, per store.
 *
 * Four, because browsers already cap connections per origin and queueing far
 * past that only moves the waiting from here into the network stack, where this
 * cannot reorder it when the view moves.
 */
const MAX_CONCURRENT_LOADS = 4
/** How long a print must stay wanted before its load is queued, in ms. */
const SETTLE_MS = 140
/**
 * A focused print is the one thing the viewer is waiting on, so it skips both
 * the settle delay and the back of the queue.
 */
const IMMEDIATE = { settleMs: 0, priority: -1 }

function createStore({ graceMs = 0, limit = 0, settleMs = SETTLE_MS } = {}) {
  /** url → entry */
  const entries = new Map()
  /** urls nothing currently wants, least-recently-released first. */
  const idle = []
  /** urls waiting for a load slot. */
  const queue = []
  let inFlight = 0
  let paused = false
  let pumpScheduled = false

  function forget(url) {
    const i = idle.indexOf(url)
    if (i !== -1) idle.splice(i, 1)
  }

  function unqueue(url) {
    const i = queue.indexOf(url)
    if (i !== -1) queue.splice(i, 1)
  }

  function destroy(url) {
    const entry = entries.get(url)
    if (!entry) return
    entries.delete(url)
    forget(url)
    unqueue(url)
    if (entry.disposeTimer) clearTimeout(entry.disposeTimer)
    if (entry.settleTimer) clearTimeout(entry.settleTimer)
    // Marks any in-flight load as unwanted, so it disposes on arrival rather
    // than resurrecting an entry that has already been accounted for.
    entry.aborted = true
    if (entry.texture) entry.texture.dispose()
  }

  /*
   * Evict the least-recently-released until the cap is met.
   *
   * The url is taken off `idle` here rather than relying on destroy to do it.
   * destroy returns early for a url it no longer holds, so a stale entry left on
   * the list would make this loop spin on the same url forever, with the
   * condition never able to change — a hang, not a leak.
   */
  function trim() {
    while (limit && idle.length && entries.size > limit) destroy(idle.shift())
  }

  function load(url, entry) {
    entry.state = 'loading'
    inFlight++
    const done = () => {
      inFlight--
      pump()
    }
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        done()
        if (entry.aborted) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = ANISOTROPY
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = true
        // Upload now, while nothing is moving, rather than on first draw.
        if (renderer) renderer.initTexture(texture)
        entry.texture = texture
        entry.state = 'ready'
        for (const fn of entry.listeners) fn(texture)
      },
      undefined,
      () => {
        done()
        if (entry.aborted) return
        entry.state = 'failed'
        for (const fn of entry.listeners) fn(null)
      }
    )
  }

  /*
   * Pump once for everything that became wanted in the same tick.
   *
   * Prints come into frame together — opening the gallery makes a dozen visible
   * in one frame — so their settle timers all land in the same tick. Pumping
   * from each one in turn would hand the four slots to whichever settled first,
   * which is array order, and priority would only ever get to sort the backlog.
   * Waiting for the tick to finish lets the whole batch be considered at once,
   * which is what makes "nearest the middle of the view first" true of the
   * loads that actually start first.
   */
  function schedulePump() {
    if (pumpScheduled) return
    pumpScheduled = true
    queueMicrotask(() => {
      pumpScheduled = false
      pump()
    })
  }

  /** Start as many queued loads as the cap allows, nearest the view first. */
  function pump() {
    if (paused) return
    while (inFlight < MAX_CONCURRENT_LOADS && queue.length) {
      let best = 0
      for (let i = 1; i < queue.length; i++) {
        const a = entries.get(queue[i])
        const b = entries.get(queue[best])
        if ((a ? a.priority : Infinity) < (b ? b.priority : Infinity)) best = i
      }
      const url = queue.splice(best, 1)[0]
      const entry = entries.get(url)
      if (entry && !entry.aborted) load(url, entry)
    }
  }

  /**
   * @param {string} url
   * @param {Function} listener called with the texture, or null on failure
   * @param {{settleMs?: number, priority?: number}} [opts] priority orders the
   *   queue, lowest first — the wall passes distance from the centre of view.
   */
  function acquire(url, listener, opts = {}) {
    const priority = opts.priority ?? 0
    let entry = entries.get(url)

    if (!entry) {
      entry = {
        texture: null,
        refs: 0,
        listeners: new Set(),
        aborted: false,
        disposeTimer: null,
        settleTimer: null,
        state: 'settling',
        priority,
      }
      entries.set(url, entry)

      const enqueue = () => {
        entry.settleTimer = null
        if (entry.aborted) return
        entry.state = 'queued'
        queue.push(url)
        schedulePump()
      }
      const wait = opts.settleMs ?? settleMs
      if (wait > 0) entry.settleTimer = setTimeout(enqueue, wait)
      else enqueue()
    } else {
      // Whoever wants it most urgently sets the order.
      entry.priority = Math.min(entry.priority, priority)
    }

    if (entry.disposeTimer) {
      clearTimeout(entry.disposeTimer)
      entry.disposeTimer = null
    }
    forget(url)
    entry.refs++
    entry.listeners.add(listener)
    trim()
    return entry.texture
  }

  function release(url, listener) {
    const entry = entries.get(url)
    if (!entry) return
    entry.listeners.delete(listener)
    entry.refs = Math.max(0, entry.refs - 1)
    if (entry.refs > 0) return

    /*
     * Nothing was ever fetched and nothing wants it now, so there is nothing
     * worth keeping: drop it outright. This is what makes a fast pan cheap —
     * prints that were only swept across never reach the network at all.
     */
    if (entry.state === 'settling' || entry.state === 'queued') {
      destroy(url)
      return
    }

    // Never twice: an effect that acquires and releases more than once — React
    // runs them twice in development — would otherwise leave a duplicate behind
    // that no longer matches anything in `entries`.
    if (!idle.includes(url)) idle.push(url)
    if (graceMs) entry.disposeTimer = setTimeout(() => destroy(url), graceMs)
    trim()
  }

  /**
   * Drop everything, including what is still within its grace period.
   *
   * Leaving the gallery is not the same as panning a print out of shot: the
   * cap keeps up to three full-resolution textures resident so that stepping
   * back through recent photos is instant, and without this they would stay
   * resident for a visitor who has left the room and may never return. Anything
   * still referenced is left alone, so a re-entry that is already mid-flight
   * cannot have the texture pulled out from under it.
   */
  function clear() {
    for (const url of [...idle]) destroy(url)
  }

  /**
   * Hold the queue while the view is moving quickly.
   *
   * A flick across the wall makes every row it crosses briefly visible, and the
   * settle delay alone does not cover it: at speed each row is still on screen
   * for longer than any delay short enough to feel responsive when stationary.
   * Holding the queue instead means those rows are queued and then dropped
   * unfetched as they leave, so a flick costs nothing and the images arrive for
   * wherever the pan actually comes to rest.
   */
  function setPaused(next) {
    if (paused === next) return
    paused = next
    if (!paused) pump()
  }

  return {
    acquire,
    release,
    clear,
    setPaused,
    /** Development introspection: what is resident, waiting, and in flight. */
    stats: () => ({
      resident: entries.size,
      loaded: [...entries.values()].filter((e) => e.texture).length,
      idle: idle.length,
      settling: [...entries.values()].filter((e) => e.state === 'settling').length,
      queued: queue.length,
      inFlight,
      paused,
      urls: [...entries.keys()],
    }),
  }
}

export const thumbStore = createStore({ graceMs: THUMB_GRACE_MS })
export const fullStore = createStore({ limit: FULL_LIMIT })

/**
 * Hold a texture from one of the stores for as long as `wanted` is true.
 *
 * `priority` is read when the load is asked for rather than tracked, so panning
 * does not re-render every print to keep it up to date; the order a print
 * entered the frame at is a good enough proxy for what to fetch first.
 *
 * @param {object} store thumbStore or fullStore
 * @param {string|undefined} url
 * @param {boolean} wanted
 * @param {{settleMs?: number, priority?: number}} [opts]
 * @returns {THREE.Texture|null}
 */
export default function usePhotoTexture(store, url, wanted, opts) {
  const [entry, setEntry] = useState(null)
  const priority = opts?.priority
  const settleMs = opts?.settleMs

  useEffect(() => {
    if (!wanted || !url) {
      setEntry(null)
      return undefined
    }

    const listener = (texture) => setEntry(texture ? { url, texture } : null)
    const ready = store.acquire(url, listener, { priority, settleMs })
    if (ready) setEntry({ url, texture: ready })

    return () => {
      store.release(url, listener)
      setEntry(null)
    }
    // priority and settleMs only steer the fetch that this effect starts, so a
    // later change to either must not tear the texture down and ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, url, wanted])

  return entry && entry.url === url ? entry.texture : null
}

export { IMMEDIATE }

// Exposed in development so the wall's memory behaviour can be measured while
// panning: what is resident should track what is in frame.
if (import.meta.env.DEV) window.__photoTextures = { thumbStore, fullStore }
