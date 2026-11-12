/*
 * The fixed tokens, for things drawn in the canvas that must match the page's
 * text. The same values are the CSS custom properties in story.css; change
 * one, change both.
 *
 * The page is near white at every hour, so the ink never changes with the time
 * of day: the hour is carried by the light and the shadow, not by the colours.
 */
export const INK = '#17181c'
export const INK_MUTED = '#646670'
/** Amber, for marks only — never for words, which it is too light to carry on white. */
export const ACCENT = '#c8873a'
