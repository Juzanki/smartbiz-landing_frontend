// vite.config.js — SmartBiz (Vue 3 + Vite + Netlify)
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/* ---------------------- Helpers ---------------------- */
const stripEndSlashes = (u) => String(u || '').replace(/\/+$/, '')
const isHttpsPublic = (u) => /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(String(u || ''))
const isPrivateOrLocal = (u) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(
    String(u || '')
  )

function vendorChunks(id) {
  if (!id || !id.includes('node_modules')) return
  const tail = id.split('node_modules/')[1] || ''
  const scope = tail.startsWith('@') ? tail.split('/').slice(0, 2).join('/') : tail.split('/')[0]
  if (/^vue($|\/)|vue-router/.test(scope)) return 'vue'
  if (/(apexcharts|chart\.js)/.test(scope)) return 'charts'
  if (/@?unocss|@vueuse|axios|pinia|vue-i18n/.test(scope)) return 'utils'
  return 'vendor'
}

/** Sanitize API base:
 * - '/api' or ''  → tumia Netlify proxy
 * - https://...   → ruhusu (public domain tu)
 * - vingine vyote → rudi '/api'
 */
function normalizeApiBase(env) {
  const raw = env.VITE_API_BASE ?? env.VITE_API_BASE_URL ?? ''
  if (!raw || String(raw).trim() === '' || String(raw).trim() === '/api') return '/api'
  const c = stripEndSlashes(String(raw).trim())
  if (isHttpsPublic(c) && !isPrivateOrLocal(c)) return c
  return '/api'
}

/* ---------------------- Config ----------------------- */
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const IS_PROD = mode === 'production'
  const API_BASE = normalizeApiBase(env) // '/api' au https://...

  const plugins = [vue()]

  return {
    // 🔴 WA MUHIMU: Assets ziandikwe kama /assets/... sio relative → inamaliza MIME text/html
    base: '/',

    plugins,

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
      // kwa reference ya build/time tu — API base haikai hapa tena
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
      // Dev proxy: ikiwa umeweka URL kamili ya HTTPS, piga /api → huko.
      // Ukiacha '/api', haitafanya kitu hapa (uta-test dev dhidi ya Netlify proxy au mock).
      proxy:
        API_BASE !== '/api'
          ? {
              '/api': {
                target: API_BASE,
                changeOrigin: true,
                secure: true,
              },
            }
          : undefined,
    },

    preview: { host: '0.0.0.0', port: 4173, strictPort: true },

    optimizeDeps: {
      include: ['vue', 'vue-router', 'axios', '@vueuse/core'],
      entries: ['./index.html'],
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2019',
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: vendorChunks,
        },
      },
      minify: IS_PROD ? 'terser' : false,
      terserOptions: {
        mangle: false,
        compress: { passes: 2, drop_debugger: true, drop_console: false },
        format: { comments: false },
      },
      emptyOutDir: true,
      modulePreload: { polyfill: false },
    },
  }
})
