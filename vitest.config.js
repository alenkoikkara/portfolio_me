import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Test setup for the parts of this scene that can be reasoned about off-GPU.
 *
 * The bulk of this codebase draws: `Device`, `Gallery`, `Projector` and their
 * neighbours are react-three-fiber components whose behaviour is a camera pose,
 * a shader program or a texture upload. Those are verified by driving the
 * running scene and measuring it — see **Verifying changes** in CLAUDE.md — and
 * a jsdom mock of WebGL would only assert that the mock was called.
 *
 * What is tested here is everything that decides *what* the scene should do:
 * the state machine, the wall's layout arithmetic, the texture stores' loading
 * and eviction policy, and the DOM overlay. Those hold the rules that are easy
 * to break by accident and expensive to notice, so the threshold below applies
 * to them rather than to the repository as a whole.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      /*
       * Scoped on purpose. Adding the drawing components here would not add
       * confidence — it would add mocks of three.js that pass whatever the
       * implementation happens to do.
       */
      include: [
        'src/scene/galleryLayout.js',
        'src/scene/useDeviceStore.js',
        'src/scene/usePhotoTexture.js',
        'src/scene/usePreviewTexture.js',
        'src/scene/deviceFade.js',
        'src/data/photos.js',
        'src/components/Overlay.jsx',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
})
