import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PhoneNotice from './components/PhoneNotice.jsx'
import { phoneLayout } from './story/environment'
import { PHONE_WIDTH } from './scene/cameraFov'

const narrow = window.matchMedia(`(max-width: ${PHONE_WIDTH - 1}px)`)
const subscribe = (change) => {
  narrow.addEventListener('change', change)
  return () => narrow.removeEventListener('change', change)
}

/** The app, or — while the phone layout is off — the note a phone gets instead. */
function Root() {
  const isNarrow = useSyncExternalStore(subscribe, () => narrow.matches)
  return isNarrow && !phoneLayout.on ? <PhoneNotice /> : <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
