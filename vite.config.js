// vite.config.js — SmartBiz (Vue 3 + Vite + Netlify, stable)
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/* ───────────── Helpers ───────────── */
const stripEndSlashes = (u) => String(u || '').replace(/\/+$/, '')
const isHttpsPublic = (u) => /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(String(u || ''))
const isPrivateOrLocal = (u) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i
    .test(String(u || ''))

/** Normalize API base:
 *  - '' or '/api'  → tumia Netlify proxy
 *  - public HTTPS  → ruhusu
 *  - vingine vyote → '/api'
 */
function normalizeApiBase (env) {
  const raw = env.VITE_API_BASE ?? env.VITE_API_BASE_URL ?? ''
  if (!raw || String(raw).trim() === '' || String(raw).trim() === '/api') return '/api'
  const c = stripEndSlashes(String(raw).trim())
  return (isHttpsPublic(c) && !isPrivateOrLocal(c)) ? c : '/api'
}

/* ───────────── Config ───────────── */
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_BASE = normalizeApiBase(env)

  return {
    // 🔴 Lazima absolute: huepuka assets kurudi HTML (MIME text/html)
    base: '/',

    plugins: [vue()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@views': path.resolve(__dirname, 'src/views'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
      dedupe: ['vue', 'vue-router'],
    },

    envPrefix: ['VITE_', 'SB_'],

    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      hmr: { overlay: false },
      cors: true,
      // Dev proxy: tumia tu ikiwa umeweka URL kamili ya HTTPS.
      proxy: API_BASE !== '/api'
        ? { '/api': { target: API_BASE, changeOrigin: true, secure: true } }
        : undefined,
    },

    preview: { host: '0.0.0.0', port: 4173, strictPort: true },

    optimizeDeps: {
      include: ['vue', 'vue-router', 'axios', '@vueuse/core'],
      entries: ['./index.html'],
      esbuildOptions: { target: 'es2020' },
    },

    // 🔒 Build salama (hakuna manualChunks → hakuna TDZ/ordering issues)
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2019',
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,

      // Acha Rollup a-deal na graph ordering: no manualChunks.
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },

      // Minifier salama (kuepuka reordering hatari)
      minify: 'esbuild',

      emptyOutDir: true,
      modulePreload: { polyfill: false },
    },
  }
})
