import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // The production build gets deployed under /registration-preview/ (a
  // subpath of the same Azure SWA environment as the rest of the static
  // site), so built asset URLs must be prefixed to match — otherwise the
  // emitted HTML references /assets/... at the domain root, which 404s.
  // Local dev (`npm run dev`) keeps base '/' since Vite's dev server has
  // nothing else running at its root.
  base: command === 'build' ? '/registration-preview/' : '/',
}))
