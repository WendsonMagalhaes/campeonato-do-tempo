import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Domain/persistence tests are Node-safe; jsdom pulls @csstools/css-calc ESM
    // that breaks under the current Node/jsdom stack (ERR_REQUIRE_ESM).
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
