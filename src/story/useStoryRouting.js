import { useEffect } from 'react'
import useStoryStore from './useStoryStore'
import { CHAPTERS, chapterFromPath } from './chapters'
import { openChapter, goHomeChapter } from './navigate'

const SITE_TITLE = 'alen koikkara'
/** The number keys, in the order the sections sit on the device. */
const KEY_ORDER = ['projects', 'photography', 'about', 'contact']

// Home and the Prologue are both the site's own address.
const pathFor = (chapter) => CHAPTERS[chapter]?.path ?? '/'

/*
 * True while replaying a back or forward: the browser has already moved the
 * address, so the chapters passed through on the way (closing one section,
 * resting at home, opening the next) must not push entries of their own.
 * Cleared once the story arrives where the address says.
 */
let replaying = false

/**
 * Makes each chapter behave like a page: its own address and title, the back
 * and forward buttons, and the number keys 1–4 — and M for sound.
 */
export default function useStoryRouting() {
  const chapter = useStoryStore((s) => s.chapter)

  useEffect(() => {
    // Already out of date — a deep link moved the story on in the same flush.
    // Acting on it would rewrite the deep link's own address back to '/'.
    if (chapter !== useStoryStore.getState().chapter) return
    document.documentElement.dataset.chapter = chapter
    const path = pathFor(chapter)
    if (replaying) {
      if (window.location.pathname === path) replaying = false
    } else if (window.location.pathname !== path) {
      // The Prologue replaces an address it cannot show (a section with no
      // page yet) rather than adding a step the back button would return to.
      const write = chapter === 'prologue' ? 'replaceState' : 'pushState'
      window.history[write]({}, '', path + window.location.search)
    }
    const section = CHAPTERS[chapter]
    document.title = section ? `${section.title.toLowerCase()} · ${SITE_TITLE}` : SITE_TITLE
  }, [chapter])

  useEffect(() => {
    const onPop = () => {
      if (!useStoryStore.getState().started) return
      const target = chapterFromPath(window.location.pathname)
      if ((target ?? 'home') === useStoryStore.getState().chapter) return
      replaying = true
      if (target) openChapter(target)
      else goHomeChapter()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (!useStoryStore.getState().started) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'm' || e.key === 'M') {
        useStoryStore.getState().toggleSound()
        return
      }
      const index = '1234'.indexOf(e.key)
      if (index >= 0 && e.key.length === 1) openChapter(KEY_ORDER[index])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
