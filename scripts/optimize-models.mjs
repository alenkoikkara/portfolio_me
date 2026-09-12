/**
 * Shrink the GLB files the scene loads, without altering how it looks.
 *
 * The pristine exports live in `src/assets/glb/original/` and are never
 * touched; this writes the optimised copies the app imports. Re-running is
 * therefore idempotent — it always starts from the originals rather than
 * compressing something already compressed.
 *
 * Two things dominate the payload, and each is handled on its own terms:
 *
 *   Textures. Every map in these files is tiled grain or glitter, repeated 9
 *   to 75 times across a part no bigger than a few centimetres. A 2048px
 *   source contributes well under a pixel of detail per screen pixel at that
 *   repeat, so the resolution is spent on nothing. They are resized and moved
 *   to WebP, which three.js reads via EXT_texture_webp.
 *
 *   Geometry. Compressed with meshopt, which drei's loader already enables and
 *   bundles a decoder for, so this costs no extra request and decodes far
 *   faster than Draco would.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, resample, textureCompress } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const GLB_DIR = path.join(HERE, '..', 'src', 'assets', 'glb')
const SRC_DIR = path.join(GLB_DIR, 'original')

/**
 * Per-file texture budget. Chosen from the tiling in each file: the device's
 * grain repeats 75x, the cartridge's glitter 9x, so neither needs to carry
 * more than a modest square.
 */
const PLAN = {
  'device.glb': { texture: 512 },
  'cartridge.glb': { texture: 512 },
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`

async function optimize(name, { texture }) {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

  const inPath = path.join(SRC_DIR, name)
  const outPath = path.join(GLB_DIR, name)
  const before = (await fs.stat(inPath)).size

  const document = await io.read(inPath)

  await document.transform(
    // Identical textures and accessors are stored once.
    dedup(),
    // Animation keyframes that only restate the previous value are dropped.
    resample(),
    // Anything the scene no longer references goes, with two exceptions.
    //
    // Empty nodes are kept: the slot and lens anchors carry no geometry, and
    // while the scene currently declares its own, dropping the authored ones
    // would quietly remove the reference positions they encode.
    //
    // Vertex attributes are kept because the cartridge label, text, contacts
    // and foil carry no texture *in the file* — the project artwork is
    // assigned to the label at runtime. Pruning their UVs as unused leaves
    // that artwork with nowhere to map, and the cartridges come out blank.
    prune({ keepLeaves: true, keepAttributes: true }),
    // The big one: smaller squares, and WebP instead of JPEG.
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [texture, texture],
      quality: 90,
    }),
  )

  await MeshoptEncoder.ready
  io.setVertexLayout('separate')
  document.createExtension(
    (await import('@gltf-transform/extensions')).EXTMeshoptCompression,
  )
    .setRequired(true)
    .setEncoderOptions({ method: 'quantize' })

  await io.write(outPath, document)
  const after = (await fs.stat(outPath)).size
  console.log(
    `${name.padEnd(15)} ${kb(before).padStart(9)} -> ${kb(after).padStart(9)}` +
    `  (${(100 - (after / before) * 100).toFixed(0)}% smaller)`,
  )
  return { before, after }
}

let totalBefore = 0
let totalAfter = 0
for (const [name, plan] of Object.entries(PLAN)) {
  const { before, after } = await optimize(name, plan)
  totalBefore += before
  totalAfter += after
}
console.log(
  `${'total'.padEnd(15)} ${kb(totalBefore).padStart(9)} -> ${kb(totalAfter).padStart(9)}` +
  `  (${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}% smaller)`,
)
