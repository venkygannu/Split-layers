import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allow eval so Vite's HMR and dev tooling work under CSP
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'self'; base-uri 'self';",
    },
  },
})
