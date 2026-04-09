import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['firebase/app', 'firebase/database', 'firebase/auth']
  },
  build: {
    rollupOptions: {
      external: []
    }
  }
})