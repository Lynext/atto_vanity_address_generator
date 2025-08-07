import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  optimizeDeps: {
    include: ['bip39', 'tweetnacl', 'blakejs', 'buffer', 'crypto-browserify', 'stream-browserify', 'util']
  },
  esbuild: {
    define: {
      global: 'globalThis'
    }
  },
  server: {
    host: true,
    port: 3000
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: true
  }
})