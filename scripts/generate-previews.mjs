/**
 * Capture a tall screenshot of every project site for the projector plane.
 *
 *   npm run previews            all projects
 *   npm run previews -- pulse   one project, by id or slug
 *
 * Adding a project is then: append an entry to src/data/projects.js, run this.
 *
 * Needs Playwright and sharp, which are not installed by default because the
 * browser download is large and previews only need regenerating when a site
 * changes:
 *
 *   npm i -D playwright sharp && npx playwright install chromium
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'previews')

// Set viewport to standard desktop resolution (1920x1080)
const VIEWPORT = { width: 1920, height: 1080 }
const OUTPUT_WIDTH = 1024
const QUALITY = 82

async function load(name, hint) {
  try {
    return await import(name)
  } catch {
    console.error(`\nMissing "${name}". Install the capture tools first:\n`)
    console.error('  npm i -D playwright sharp && npx playwright install chromium\n')
    if (hint) console.error(hint)
    process.exit(1)
  }
}

async function readProjects() {
  const mod = await import(join(ROOT, 'src', 'data', 'projects.js'))
  return mod.PROJECTS
}

function slugOf(project) {
  return (project.preview?.split('/').pop() || `${project.id}.webp`).replace(/\.webp$/, '')
}

async function main() {
  const filter = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const all = await readProjects()
  const projects = filter.length
    ? all.filter((p) => filter.includes(p.id) || filter.includes(slugOf(p)))
    : all

  if (!projects.length) {
    console.error(`No projects matched: ${filter.join(', ')}`)
    process.exit(1)
  }

  const { chromium } = await load('playwright')
  const sharp = (await load('sharp')).default

  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })

  for (const project of projects) {
    const slug = slugOf(project)
    try {
      // Use 'load' instead of 'networkidle' because some sites have continuous background network activity that prevents networkidle
      await page.goto(project.url, { waitUntil: 'load', timeout: 45000 })
      // Let entrance animations and lazy images settle before the shot.
      await page.waitForTimeout(2500)
      
      // Use native mouse wheel to scroll, which works better with virtual scrolling and WebGL
      let currentScroll = 0
      const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight)
      const viewportHeight = VIEWPORT.height
      const scrollStep = 500

      while (currentScroll < maxScroll) {
        await page.mouse.wheel(0, scrollStep)
        currentScroll += scrollStep
        // Wait to allow WebGL to render and animations to settle
        await page.waitForTimeout(200)
      }
      
      // Scroll back up quickly
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(1000)

      const png = await page.screenshot({ fullPage: true })
      
      let img = sharp(png)
      const metadata = await img.metadata()
      
      const scale = OUTPUT_WIDTH / metadata.width
      const expectedHeight = metadata.height * scale
      
      let resizeOpts = { width: OUTPUT_WIDTH, withoutEnlargement: true }
      if (expectedHeight > 8192) {
        resizeOpts.height = 8192
        resizeOpts.fit = 'cover'
        resizeOpts.position = 'top'
      }

      const webp = await img
        .resize(resizeOpts)
        .webp({ quality: QUALITY })
        .toBuffer()
      await writeFile(join(OUT_DIR, `${slug}.webp`), webp)
      console.log(`✓ ${slug}.webp  ${(webp.length / 1024).toFixed(0)} KB  ${project.url}`)
    } catch (err) {
      console.error(`✗ ${slug}  ${project.url}\n  ${err.message}`)
    }
  }

  await browser.close()
}

main()
