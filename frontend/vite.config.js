import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Instant hot reload configuration
    hmr: {
      overlay: true,  // Show errors as overlay
    },
    watch: {
      usePolling: true,  // Better for Windows/network drives
      interval: 100,     // Check for changes every 100ms
    },
    // API proxy to backend
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true,  // WebSocket support
      }
    }
  },
  // Disable caching during development
  cacheDir: '.vite',
  build: {
    // Clear output directory before build
    emptyOutDir: true,
    // Generate source maps for debugging
    sourcemap: true,
  },
  // Optimize deps for faster reload
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
