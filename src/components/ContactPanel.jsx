import React, { useState } from 'react'
import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from '../story/useStoryStore'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../data/contact'

const LINKS = [
  ['linkedin', SOCIAL_LINKS.linkedin],
  ['github', SOCIAL_LINKS.github],
  ['medium', SOCIAL_LINKS.medium],
]

/**
 * The contact chapter: 06:05, a new day, and the ways to say hello. It sits
 * beside the device at rest (below it on a phone), on the sky like the rest
 * of the chrome, and reads the stage's ink so it follows the light.
 *
 * Every way of reaching out — writing, copying the address, following a link
 * — resolves the chord the chapter is holding (`resolveContact`). Leaving
 * without doing any of it just lets the chord fade: no guilt trip.
 */
export default function ContactPanel() {
  const closeContact = useDeviceStore((s) => s.closeContact)
  const resolveContact = useStoryStore((s) => s.resolveContact)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      resolveContact()
    } catch {
      // No clipboard (an insecure origin, or permission refused): the address
      // is on the page to copy by hand, so there is nothing to report.
    }
  }

  return (
    <div className="overlay">
      <button className="overlay-close" onClick={closeContact} aria-label="Close contact">
        ×
      </button>

      <section className="contact" aria-label="Contact">
        <p className="contact__eyebrow">contact</p>
        <h2 className="contact__title">say hello</h2>

        {CONTACT_EMAIL && (
          <div className="contact__email">
            <span className="contact__address">{CONTACT_EMAIL}</span>
            <span className="contact__actions">
              <a href={`mailto:${CONTACT_EMAIL}`} onClick={resolveContact}>write</a>
              <button type="button" onClick={copy}>{copied ? 'copied' : 'copy'}</button>
            </span>
          </div>
        )}

        <ul className="contact__links">
          {LINKS.map(([label, url]) => (
            <li key={label}>
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={resolveContact}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="overlay-hint">
        <span>esc close</span>
      </div>
    </div>
  )
}
