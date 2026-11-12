import useDeviceStore from '../scene/useDeviceStore'
import useStoryStore from './useStoryStore'
import { chapterForMode } from './chapters'

/**
 * Turns the device's modes into the story's chapters: one subscription, so the
 * carousel, the wall and the about view never need to know the story exists.
 * Returns the unsubscribe.
 */
export function bridgeDeviceToStory() {
  return useDeviceStore.subscribe((s, prev) => {
    if (s.mode === prev.mode) return
    const chapter = chapterForMode(s.mode)
    const story = useStoryStore.getState()
    if (!chapter || !story.started) return
    if (chapter === 'home') story.returnHome()
    else story.goTo(chapter)
  })
}
