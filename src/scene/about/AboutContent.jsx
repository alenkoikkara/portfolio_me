import React from 'react'

/**
 * The words on the about panel, and nothing else.
 *
 * Kept apart from AboutPanel.jsx so the copy can be reworked without going
 * near the scene code. Short on purpose: three paragraphs and three bullets is
 * about the ceiling before the column stops reading as a quiet page.
 */
export default function AboutContent() {
  return (
    <article className="about">
      <header className="about__header">
        <p className="about__eyebrow">About</p>
        <h1 className="about__name">Alen Koikkara</h1>
        <p className="about__role">Engineer · Chicago</p>
      </header>

      <section className="about__bio">
        <p>
          I build at the seam between frontend craft and backend systems, currently
          contracting with McKinsey&apos;s QuantumBlack team on a production data pipeline.
          Before that: GenAI and RAG at GE HealthCare, iOS and web elsewhere.
        </p>
        <p>
          I&apos;m drawn to work that treats interfaces as instruments; tactile, legible,
          worth returning to. This site is one of those experiments.
        </p>
      </section>

      <section className="about__currently">
        <h2 className="about__h2">Currently</h2>
        <ul>
          <li>Building this site in Three.js + R3F</li>
          <li>Currently working at McKinsey & Company</li>
          <li>Shooting on whatever&apos;s in my pocket — mostly an iPhone</li>
        </ul>
      </section>
    </article>
  )
}
