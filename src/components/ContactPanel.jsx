import React, { useState } from 'react'
import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from '../story/useStoryStore'
import { AVAILABILITY, CONTACT_EMAIL, SOCIAL_LINKS } from '../data/contact'
import Dialog from './Dialog'

/**
 * Contact: the address with a Copy that answers "Copied", a mailto, LinkedIn,
 * and what Alen is open to — so a first-time visitor has the address on their
 * clipboard two clicks after the page comes alive (the key, then Copy).
 *
 * Every way of reaching out — copying, writing, following a link — resolves
 * the chapter (`resolveContact`), which swaps its caption for "See you
 * tomorrow."
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
      // is on the panel to select by hand, so there is nothing to report.
    }
  }

  return (
    <Dialog eyebrow="contact" title="say hello" onClose={closeContact} className="contact">
      {CONTACT_EMAIL && (
        <div className="contact__email">
          <span className="contact__address">{CONTACT_EMAIL}</span>
          <span className="contact__actions">
            <button type="button" onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button>
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={resolveContact}>Email</a>
          </span>
        </div>
      )}

      <ul className="contact__links">
        <li>
          <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" onClick={resolveContact}>
            LinkedIn
          </a>
        </li>
      </ul>

      <p className="contact__availability">
        <span className="contact__dot" aria-hidden="true">●</span> {AVAILABILITY}
      </p>
    </Dialog>
  )
}
