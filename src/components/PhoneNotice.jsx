import React, { useEffect } from 'react'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../data/contact'

const LINKS = [
  ['Email', `mailto:${CONTACT_EMAIL}`],
  ['LinkedIn', SOCIAL_LINKS.linkedin],
  ['GitHub', SOCIAL_LINKS.github],
]

/**
 * What a phone sees while the phone layout is off (`phoneLayout` in
 * environment.js): the name, a line asking for a bigger screen, and the ways to
 * reach out, on the loader's own paper.
 */
export default function PhoneNotice() {
  // The static loader in index.html would otherwise sit over this for good:
  // LoadingScreen, which lifts it, is part of the app this replaces.
  useEffect(() => { document.getElementById('boot')?.remove() }, [])

  return (
    <main className="flex min-h-svh flex-col justify-center bg-[#faf9f6] px-8 text-(--ink)">
      <p className="text-xs font-medium tracking-[0.08em] text-(--ink-muted)">alen koikkara</p>
      <h1 className="mt-4 text-2xl font-medium tracking-tight">Best on a bigger screen.</h1>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-(--ink-muted)">
        This portfolio is a 3D instrument you play with a mouse or trackpad. Open it on a laptop or desktop to see it.
      </p>
      <ul className="mt-8 flex gap-5 text-sm font-medium">
        {LINKS.map(([label, href]) => (
          <li key={label}>
            <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="hover:text-(--accent-deep)">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
