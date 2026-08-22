import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Runtime media SoT: `public/assets` (URLs `/assets/...`).
 * Do not point publicDir elsewhere — see docs/ASSET_INTAKE.md.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
