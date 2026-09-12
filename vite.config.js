import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Start the models downloading with the HTML.
 *
 * They are imported from a module, so without this the browser only learns
 * they exist after the JS chunk has downloaded, parsed and mounted — the
 * largest files on the page, queued behind everything else. A preload link
 * puts them in flight immediately, in parallel with the script.
 *
 * The filenames carry a content hash, so the links are written during the
 * build from whatever the bundle actually emitted.
 */
function preloadModels() {
  return {
    name: 'preload-models',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const models = Object.keys(ctx.bundle ?? {}).filter((f) => f.endsWith('.glb'))
      return {
        html,
        tags: models.map((file) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'fetch',
            type: 'model/gltf-binary',
            // three fetches these without credentials; the attribute has to
            // agree or the browser keeps the preload and fetches a second copy.
            crossorigin: 'anonymous',
            href: `/${file}`,
          },
          injectTo: 'head',
        })),
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadModels()],
  assetsInclude: ['**/*.glb'],
})
