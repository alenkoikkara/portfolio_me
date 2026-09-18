import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

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

const { default: usePreviewTexture } = await import('./usePreviewTexture')

const fakeTexture = (url) => ({ url, disposed: false, dispose() { this.disposed = true } })
const waiting = (url) => pending.some((p) => p.url === url)

function deliver(url) {
  const i = pending.findIndex((p) => p.url === url)
  if (i === -1) throw new Error(`nothing is loading ${url}`)
  const [entry] = pending.splice(i, 1)
  const texture = fakeTexture(url)
  entry.onLoad(texture)
  return texture
}

beforeEach(() => {
  pending.length = 0
})

describe('usePreviewTexture', () => {
  it('loads nothing until the cartridge is live', () => {
    renderHook(() => usePreviewTexture('/previews/a.webp', false))
    expect(pending).toHaveLength(0)
  })

  it('loads nothing without a url', () => {
    renderHook(() => usePreviewTexture(undefined, true))
    expect(pending).toHaveLength(0)
  })

  it('hands back the texture once it arrives', async () => {
    const { result } = renderHook(() => usePreviewTexture('/previews/a.webp', true))
    expect(result.current).toBeNull()
    await waitFor(() => expect(waiting('/previews/a.webp')).toBe(true))
    const texture = await act(async () => deliver('/previews/a.webp'))
    await waitFor(() => expect(result.current).toBe(texture))
  })

  it('disposes it when the cartridge leaves', async () => {
    const { result, rerender } = renderHook(
      ({ active }) => usePreviewTexture('/previews/b.webp', active),
      { initialProps: { active: true } },
    )
    await waitFor(() => expect(waiting('/previews/b.webp')).toBe(true))
    const texture = await act(async () => deliver('/previews/b.webp'))
    await waitFor(() => expect(result.current).toBe(texture))

    rerender({ active: false })
    expect(texture.disposed).toBe(true)
    expect(result.current).toBeNull()
  })

  it('never hands back the outgoing texture on a direct swap', async () => {
    /*
     * The hazard this guards: on a swap the url changes a render before the new
     * texture arrives, and returning the outgoing one would let the renderer
     * re-upload a texture that has already been disposed.
     */
    const { result, rerender } = renderHook(
      ({ url }) => usePreviewTexture(url, true),
      { initialProps: { url: '/previews/first.webp' } },
    )
    await waitFor(() => expect(waiting('/previews/first.webp')).toBe(true))
    const first = await act(async () => deliver('/previews/first.webp'))
    await waitFor(() => expect(result.current).toBe(first))

    rerender({ url: '/previews/second.webp' })
    expect(result.current).not.toBe(first)
    expect(result.current).toBeNull()

    await waitFor(() => expect(waiting('/previews/second.webp')).toBe(true))
    const second = await act(async () => deliver('/previews/second.webp'))
    await waitFor(() => expect(result.current).toBe(second))
  })

  it('drops a texture that arrives after the cartridge has gone', async () => {
    const { rerender } = renderHook(
      ({ active }) => usePreviewTexture('/previews/late.webp', active),
      { initialProps: { active: true } },
    )
    await waitFor(() => expect(waiting('/previews/late.webp')).toBe(true))
    rerender({ active: false })
    // The request outlived the need for it.
    const texture = await act(async () => deliver('/previews/late.webp'))
    expect(texture.disposed).toBe(true)
  })

  it('reports nothing when the image fails to load', async () => {
    const { result } = renderHook(() => usePreviewTexture('/previews/gone.webp', true))
    await waitFor(() => expect(waiting('/previews/gone.webp')).toBe(true))
    await act(async () => {
      const [entry] = pending.splice(0, 1)
      entry.onError(new Error('404'))
    })
    expect(result.current).toBeNull()
  })

  it('disposes on unmount', async () => {
    const { unmount } = renderHook(() => usePreviewTexture('/previews/c.webp', true))
    await waitFor(() => expect(waiting('/previews/c.webp')).toBe(true))
    const texture = await act(async () => deliver('/previews/c.webp'))
    unmount()
    expect(texture.disposed).toBe(true)
  })
})
