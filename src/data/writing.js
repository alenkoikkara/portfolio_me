import { SOCIAL_LINKS } from './contact'

/**
 * Alen's posts, for the Writing key's panel — hard-coded, not fetched: the
 * Medium API would be one more thing to fail at runtime for three links.
 *
 * Each `url` falls back to the Medium profile until the post's own address is
 * filled in, and `date` is shown only once it is.
 */
export const POSTS = [
  { title: 'Memento', date: null, url: null },
  { title: 'MIME types in NGINX', date: null, url: null },
  { title: 'WCAG in 2025', date: null, url: null },
].map((post) => ({ ...post, url: post.url ?? SOCIAL_LINKS.medium }))
