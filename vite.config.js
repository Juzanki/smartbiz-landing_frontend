// vite.config.ts  (tumia .js/.mjs ukipenda)
// — Netlify/Vite/Vue 3 tuned config —
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'

/* --------------------- Helpers --------------------- */
const trimSlash = (u?: string) => (typeof u === 'string' ? u.replace(/\/+$/g, '') : '')
const isHttpUrl  = (u?: string) => /^https?:\/\//i.test(u || '')
const toBool     = (v: unknown, d = false) =>
  v === 'true' || v === true ? true : v === 'false' || v === false ? false : d

/** Rollup manualChunks: tenga vendors kwenye mafaili thabiti */
function vendorChunks(id: string) {
  if (!id.includes('node_modules')) return
  const tail = id.split('node_modules/')[1] || ''
  const scope = tail.startsWith('@') ? tail.split('/').slice(0, 2).join('/') : tail.split('/')[0]

  if (/^vue($|\/)|vue-router/.test(scope)) return 'vue'
  if (/(apexcharts|chart\.js)/.test(scope)) return 'charts'
  if (/@?unocss|@vueuse|nanoid|axios|vue-i18n|pinia/.test(scope)) return 'utils'
  return 'vendor'
}

/* --------------------- Config --------------------- */
export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')       // soma .env*, VITE_* n.k.
  const IS_PROD  = mode === 'production'
  const IS_SERVE = command === 'serve'

  // Base ya app (Netlify iko kwenye root → tumia '/')
  const rawBase = trimSlash(env.VITE_BASE || '/')
  const base    = isHttpUrl(rawBase) ? '/' : (rawBase || '/')

  // API ya backend kwa dev proxy
  const RAW_API    = env.VITE_API_URL || env.API_URL || env.BACKEND_URL || 'http://localhost:8000'
  const API_TARGET = trimSlash(RAW_API)

  // Public allowed origins (kwa dev CORS)
  const PUBLIC_ORIGINS = [
    env.RAILWAY_PUBLIC_URL,
    env.NETLIFY_PUBLIC_URL,
    env.VITE_PUBLIC_ORIGIN,
    env.VERCEL_URL && `https://${env.VERCEL_URL}`,
  ].filter(Boolean).map(trimSlash)

  const plugins = [
    vue({ reactivityTransform: false }),
    vueJsx(),            // <script setup lang="tsx"> pia inafanya
    UnoCSS(),
  ]

  // DevTools (hiari) — weka VITE_DEVTOOLS=true au install package
  if (toBool(env.VITE_DEVTOOLS, false)) {
    try {
      const { default: devtools } = await import('vite-plugin-vue-devtools')
      plugins.push(devtools())
    } catch {
      console.warn('[vite] vite-plugin-vue-devtools haipo; ruka (weka VITE_DEVTOOLS=false au install).')
    }
  }

  return {
    base,
    plugins,

    resolve: {
      alias: {
        '@'          : fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@views'     : fileURLToPath(new URL('./src/views', import.meta.url)),
        '@assets'    : fileURLToPath(new URL('./src/assets', import.meta.url)), // kwa `new URL('@assets/...', import.meta.url)`
        '@utils'     : fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
      dedupe: ['vue', 'vue-router'],
    },

    envPrefix: ['VITE_', 'SB_'],
    define: {
      __APP_ENV__    : JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __APP_NAME__   : JSON.stringify(env.VITE_APP_NAME || 'SmartBiz Assistance'),
      __API_URL__    : JSON.stringify(API_TARGET),
      __DEV__        : JSON.stringify(!IS_PROD),
      __BUILD_TIME__ : JSON.stringify(new Date().toISOString()),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      open: false,
      hmr: { overlay: false },
      // kwa dev tu; Netlify itahudumia prod
      cors: PUBLIC_ORIGINS.length ? { origin: PUBLIC_ORIGINS, credentials: true } : true,
      proxy: {
        '/api': { target: API_TARGET, changeOrigin: true, secure: false },
        // '/socket.io': { target: API_TARGET, ws: true, changeOrigin: true },
      },
      watch: { usePolling: false, interval: 100 },
    },

    preview: { host: '0.0.0.0', port: 4173, strictPort: true },

    /* ----- Dep Optimizer (salama kwa Windows + JSX/TSX) ----- */
    optimizeDeps: {
      include: [
        'vue', 'vue-router', 'axios', '@vueuse/core', 'vue-i18n',
        'vue-toastification', 'pinia', 'socket.io-client', 'hls.js', 'vue3-draggable-resizable'
      ],
      exclude: ['@vueuse/motion'],
      entries: ['./index.html'],
      force: true,
      esbuildOptions: {
        target: 'es2020',
        jsx: 'preserve', // acha plugin-vue-jsx ishughulikie JSX
        loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx' },
        tsconfigRaw: { compilerOptions: { jsx: 'preserve', useDefineForClassFields: false } },
      },
    },

    /* --------------------- Build --------------------- */
    build: {
      outDir: 'dist',
      target: 'es2022',           // inaruhusu top-level await
      cssTarget: 'chrome90',
      sourcemap: true,            // washa ili kutambua issue za prod kirahisi
      brotliSize: false,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          entryFileNames : 'assets/[name]-[hash].js',
          chunkFileNames : 'assets/[name]-[hash].js',
          assetFileNames : 'assets/[name]-[hash][extname]',
          manualChunks   : vendorChunks,
        },
      },
      commonjsOptions: { transformMixedEsModules: true },
      emptyOutDir: true,
    },

    esbuild: { drop: IS_PROD ? ['console', 'debugger'] : [] },
    worker: { format: 'es' },
    json: { stringify: true },
    css: { devSourcemap: false },
  }
})
