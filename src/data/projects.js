/**
 * The cartridges, in carousel order: Alen's own engineering first, then the
 * sites built for clients. Adding a project is adding an entry here.
 *
 *   id        stable slug (also the cartridge's key, and later its address)
 *   title     the project's name
 *   outcome   one line: what it is, for whom
 *   role      what Alen did — jurors look closely at who built what
 *   stack     the main tools, a handful
 *   timeline  when, and how long if known
 *   result    one concrete result
 *   label     the cartridge's colour, one of CART_COLORS
 *   preview   a tall screenshot scrolled by the projector (`npm run previews`),
 *             or null for a typographic title card drawn from the fields above
 *   url       where to see it, if anywhere
 *
 * TO CONFIRM: drafted from the repositories and live sites. Every role,
 * timeline and result is Alen's to check before submission — and a measured
 * result beats a description wherever there is one. TO FILL: screenshots for
 * the three own projects (`preview`), which show title cards until then.
 */

/*
 * The cartridge colours: equal lightness (OKLCH L 0.71, C 0.1), so no
 * cartridge shouts over another, and ink text on every one passes 6.5:1. At
 * L 0.86, and then 0.78, they washed out against the near-white page.
 */
export const CART_COLORS = {
  rose: '#D78794',
  apricot: '#D09260',
  sage: '#72B380',
  teal: '#45B5B5',
  sky: '#63AADA',
  lilac: '#AB93D7',
}

const INK = '#17181C'

const ENTRIES = [
  {
    id: 'asset-dashboard',
    title: 'Asset Dashboard',
    outcome: 'One live view of an Indian equity portfolio across brokers',
    role: 'Design + build',
    stack: ['React', 'TypeScript', 'Recharts', 'FastAPI', 'SQLite', 'Claude API'],
    timeline: '2026',
    result: 'Zerodha and Groww holdings in one dashboard, refreshed on a schedule, with AI commentary',
    label: 'teal',
    preview: null,
    url: 'https://github.com/alenkoikkara/asset_dashboard_backend',
  },
  {
    id: 'memento',
    title: 'Memento',
    outcome: 'Save anything from the web, find it again by meaning',
    role: 'Design + build',
    stack: ['FastAPI', 'React', 'ChromaDB', 'Cohere', 'Chrome extension', 'Docker'],
    timeline: '2025',
    result: 'Semantic search over saved pages, one click from a Chrome extension',
    label: 'lilac',
    preview: null,
    url: 'https://github.com/alenkoikkara/memorygraph',
  },
  {
    id: 'mealview',
    title: 'MealView',
    outcome: 'An iOS companion for finding recipes and restaurants nearby',
    role: 'Design + build',
    stack: ['SwiftUI', 'MapKit', 'CoreLocation', 'MVVM'],
    timeline: '2026',
    result: 'Recipe search, categories, favourites and a map of nearby restaurants, all native',
    label: 'apricot',
    preview: null,
    url: 'https://github.com/alenkoikkara/MealView',
  },
  {
    id: 'sudeshna-gangoli',
    title: 'Sudeshna Gangoli',
    outcome: 'Portfolio site for a designer', // TO CONFIRM: their field, and whether Alen designed it too
    role: 'Build',
    stack: ['React', 'Vite'],
    timeline: '2026',
    result: 'Live at sudeshnagangoli.com',
    label: 'rose',
    preview: '/previews/portfolio.webp',
    url: 'https://sudeshnagangoli.com/home',
  },
  {
    id: 'shreya',
    title: 'Shreya’s UX folio',
    outcome: 'Portfolio site for a UX designer', // TO CONFIRM: whether Alen designed it too
    role: 'Build',
    stack: ['React'],
    timeline: '2026',
    result: 'Live at shreyauxfolio.net',
    label: 'sage',
    preview: '/previews/shreya.webp',
    url: 'https://shreyauxfolio.net/',
  },
  {
    id: 'anchal-maria',
    title: 'Anchal Maria',
    outcome: 'Portfolio site for a designer', // TO CONFIRM: their field, and who designed it
    role: 'Build (Framer)',
    stack: ['Framer'],
    timeline: '2025',
    result: 'Live on Framer',
    label: 'sky',
    preview: '/previews/anchal.webp',
    url: 'https://anchalmaria.framer.website/',
  },
]

/*
 * What the scene reads: `color` and `inkColor` for the cartridge's shell and
 * label ink, and `subtitle` for the line under the title wherever it is shown.
 */
export const PROJECTS = ENTRIES.map((p) => ({
  ...p,
  color: CART_COLORS[p.label],
  inkColor: INK,
  subtitle: p.outcome,
}))
