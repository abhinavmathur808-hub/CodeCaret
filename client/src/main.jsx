import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { applyTheme, getStoredTheme } from './themes'
import { GOOGLE_CLIENT_ID } from './config'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary'

// Applied before the first paint so the saved theme never flashes
// the default palette on load.
applyTheme(getStoredTheme())

/* A deploy replaces the hashed chunk files. A tab opened before it
   still asks for the old names, and the next lazily loaded page then
   fails to load. Reloading picks up the new build. At most once in
   ten seconds: a chunk that is genuinely broken fails again right
   after the reload, and must surface as an error, not a reload loop. */
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'cc_chunk_reload_at'
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10_000) return
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

/* GoogleOAuthProvider loads Google's script on mount, so it is only
   mounted when a client id exists — otherwise every page load would
   fetch a third-party script for a button that is never rendered. */
const withGoogle = (children) =>
  GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  ) : (
    children
  )

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>{withGoogle(<App />)}</AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
