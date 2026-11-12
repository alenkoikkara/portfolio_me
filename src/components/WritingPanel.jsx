import React from 'react'
import useDeviceStore from '../scene/useDeviceStore'
import { POSTS } from '../data/writing'
import Dialog from './Dialog'

/** Writing: Alen's posts, each a real link, opened in a new tab so the scene is not torn down behind it. */
export default function WritingPanel() {
  const closeWriting = useDeviceStore((s) => s.closeWriting)
  return (
    <Dialog eyebrow="writing" title="notes, written down" onClose={closeWriting} className="contact writing">
      <ul className="writing__posts">
        {POSTS.map((post) => (
          <li key={post.title}>
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              <span className="writing__title">{post.title}</span>
              {post.date && <span className="writing__date">{post.date}</span>}
            </a>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
