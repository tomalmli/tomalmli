import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Appen anropar /api relativt. Lokalt skickar Vite anropet vidare till mock-API:t på 4000.
  server: { proxy: { '/api': 'http://localhost:4000' } },
  preview: { proxy: { '/api': 'http://localhost:4000' } },
  test: {
    globals: true, // krävs för att Testing Library ska städa DOM:en mellan tester
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.js'] // rättningens tester i grading/ körs inte av npm test
  }
})
