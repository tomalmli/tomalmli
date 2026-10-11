// Vitest-konfiguration för rättningens frontend-tester (C4–C5). Samma miljö som appens
// egna tester, men bara filerna i grading/.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  root,
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(root, 'tests/setup.js')],
    include: ['grading/**/*.test.js']
  }
})
