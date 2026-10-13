import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* Link previews (og:image, og:url) want absolute URLs, and the site's
   origin is only known per deployment. index.html says %SITE_URL%;
   this fills it from VITE_SITE_URL, or leaves the URLs relative when
   that is unset (fine locally, where nothing unfurls them anyway). */
function siteUrl(origin) {
  return {
    name: 'codecaret-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', origin),
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    siteUrl((loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || '').replace(/\/+$/, '')),
  ],
  server: {
    /* Pinned, and strict: refuse to start rather than drift.

       Sign-in is registered against this exact origin in two places
       outside this repo — the GitHub OAuth app's callback
       (http://localhost:5173/signin) and the Google client's
       authorised JavaScript origins — and the API derives GitHub's
       redirect_uri from CLIENT_URL, which says 5173 as well.

       By default Vite quietly moves to 5174, 5175… when 5173 is busy.
       On the moved port the app still LOOKS fine, but GitHub refuses
       the callback, Google can refuse the origin, and nothing says
       why. "Port 5173 is already in use" at startup is a far better
       failure than a sign-in that silently can't work. */
    port: 5173,
    strictPort: true,
  },
}))
