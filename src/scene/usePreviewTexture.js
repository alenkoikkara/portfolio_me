import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Load a project's preview screenshot only while it is needed, and dispose it
 * as soon as it is not. Preview textures are the memory cost of this scene: a
 * tall screenshot is several megabytes of VRAM once decoded, so holding all of
 * them at once is what would sink a mid-tier device.
 *
 * Loading is keyed on `active`, which the projector turns on as the cartridge
 * starts travelling and off once it has left, so at most one texture is
 * resident, plus a second in flight while swapping projects.
 *
 * The texture is returned only while it matches the url being asked for. On a
 * direct swap between projects the url changes a render before the new texture
 * arrives, and handing back the outgoing one would let the renderer re-upload
 * it after disposal, stranding a GPU texture that nothing owns.
 *
 * @param {string|undefined} url preview image path
 * @param {boolean} active whether this preview is currently wanted
 * @returns {THREE.Texture|null}
 */
export default function usePreviewTexture(url, active) {
  const [entry, setEntry] = useState(null)

  useEffect(() => {
    if (!active || !url) {
      setEntry(null)
      return undefined
    }

    let disposed = false
    let loaded = null

    new THREE.TextureLoader().load(
      url,
      (t) => {
        // The request can outlive the need for it; drop it rather than leak it.
        if (disposed) {
          t.dispose()
          return
        }
        t.colorSpace = THREE.SRGBColorSpace
        t.wrapS = THREE.ClampToEdgeWrapping
        t.wrapT = THREE.ClampToEdgeWrapping
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.generateMipmaps = true
        loaded = t
        setEntry({ url, texture: t })
      },
      undefined,
      () => {
        if (!disposed) setEntry(null)
      }
    )

    return () => {
      disposed = true
      if (loaded) loaded.dispose()
      setEntry(null)
    }
  }, [url, active])

  return entry && entry.url === url ? entry.texture : null
}
