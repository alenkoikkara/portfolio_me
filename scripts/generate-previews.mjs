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

// Matches the capture used for the committed placeholders.
const VIEWPORT = { width: 1280, height: 3200 }
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
      await page.goto(project.url, { waitUntil: 'networkidle', timeout: 45000 })
      // Let entrance animations and lazy images settle before the shot.
      await page.waitForTimeout(2500)
      const png = await page.screenshot({ fullPage: true })
      const webp = await sharp(png)
        .resize({ width: OUTPUT_WIDTH, withoutEnlargement: true })
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
