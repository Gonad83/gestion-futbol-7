import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // El manifiesto le dice a scripts/prerender.mjs qué CSS y JS usa cada página pública.
  build: { manifest: true },
})
