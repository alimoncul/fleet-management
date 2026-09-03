import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Project Pages serve from /<repo>/. Dev server stays at root.
  base: command === 'build' ? '/fleet-management/' : '/',
  plugins: [react()],
}))
