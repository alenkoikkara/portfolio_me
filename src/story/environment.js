/**
 * What the visitor's device asks for, read once per question. Shared by the
 * ambient polish, which all bows out the same way.
 */

/** The visitor asked their system for less motion. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}

/**
 * A phone or small tablet: a touch-first pointer or a narrow window. The
 * ambient extras (the train, the cursor glint) are skipped here, and the
 * shadow map is halved — a phone's GPU is the tightest budget the scene has.
 */
export function isMobile() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)')?.matches === true || window.innerWidth < 640
}
