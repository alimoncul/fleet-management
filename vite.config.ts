import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl 6 ships its web worker as a separate file that Vite's dep
  // optimizer doesn't copy; serving it unbundled fixes worker resolution.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
