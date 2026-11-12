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

/**
 * A pointer that cannot hover — a finger. The wording follows it ("tap to
 * close", no arrow-key hints), read from the input itself rather than from
 * the user agent, so a touch laptop with a mouse attached still reads "esc".
 */
export function isTouch() {
  return typeof window !== 'undefined' && window.matchMedia?.('(hover: none)')?.matches === true
}

/**
 * The phone layout (under `PHONE_WIDTH`) is switched off for now: a phone is
 * shown a short note instead (PhoneNotice.jsx). The phone code all stays in
 * place — turn this on to bring it back.
 */
export const phoneLayout = { on: false }
