import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: process.env.VITEST
    ? {
      conditions: ['browser']
    } : undefined,
  server: mode === 'development' ? {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.url)
          })
        }
      },
    },
  } : undefined,
}))
