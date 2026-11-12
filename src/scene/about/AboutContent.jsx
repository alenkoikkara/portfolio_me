import React from 'react'

const CURRENTLY = [
  'Building this site in Three.js + R3F',
  'Currently working at HouseFacts',
  'Shooting on whatever’s in my pocket.',
]

/**
 * The words on the about panel, and nothing else.
 *
 * Kept apart from AboutPanel.jsx so the copy can be reworked without going
 * near the scene code. Short on purpose: three paragraphs and three bullets is
 * about the ceiling before the column stops reading as a quiet page.
 *
 * The site's own typeface throughout — hierarchy from size, weight and spacing
 * alone. Every colour reads a `--stage-*` variable, so the column follows the
 * room's theme: a fixed colour, or one keyed to the OS's dark mode, could put
 * pale text on the light page.
 */
export default function AboutContent() {
  return (
    <article className="text-left text-[15px] font-normal leading-[1.55] text-(--stage-ink) select-text">
      <header className="mb-7">
        <p className="mb-2.5 text-[10px] uppercase tracking-[0.14em] text-(--stage-muted)">About</p>
        <h1 className="mb-2 text-[30px] font-medium leading-[1.05] tracking-[-0.01em]">Alen Koikkara</h1>
        <p className="text-xs text-(--stage-muted)">Engineer · Chicago</p>
      </header>

      <section className="space-y-3.5">
        <p>
          I build at the seam between frontend craft and backend systems, currently
          as a senior full-stack developer at HouseFacts. Before that: a production data
          pipeline with McKinsey&apos;s QuantumBlack, GenAI and RAG at GE HealthCare, iOS and
          web elsewhere.
        </p>
        <p>
          I&apos;m drawn to work that treats interfaces as instruments; tactile, legible,
          worth returning to. This site is one of those experiments.
        </p>
      </section>

      <section className="mt-7">
        <h2 className="mb-2.5 text-sm font-medium">Currently</h2>
        <ul>
          {CURRENTLY.map((item) => (
            <li
              key={item}
              className="relative mb-1 pl-3.5 before:absolute before:left-0 before:top-2.75 before:h-px before:w-1.5 before:bg-(--stage-line) before:content-['']"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
