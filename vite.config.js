// vite.config.js — Vue 3 + Vite + Netlify (robust & safe)
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'

/* ---------------------- Helpers ---------------------- */
const trimSlash = (u) => (typeof u === 'string' ? u.replace(/\/+$/g, '') : '')
const isHttpUrl  = (u) => /^https?:\/\//i.test(u || '')
const toBool     = (v, d = false) => (v === 'true' || v === true ? true : v === 'false' || v === false ? false : d)

/** Optional vendor chunking (OFF by default — safer) */
function vendorChunks(id) {
  if (!id || !id.includes('node_modules')) return
  const tail  = id.split('node_modules/')[1] || ''
  const scope = tail.startsWith('@') ? tail.split('/').slice(0, 2).join('/') : tail.split('/')[0]
  if (/^vue($|\/)|vue-router/.test(scope)) return 'vue'
  if (/(apexcharts|chart\.js)/.test(scope)) return 'charts'
  if (/@?unocss|@vueuse|nanoid|axios|vue-i18n|pinia/.test(scope)) return 'utils'
  return 'vendor'
}

/* ---------------------- Config ----------------------- */
export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')          // somba .env* zote
  const IS_PROD  = mode === 'production'
  const IS_SERVE = command === 'serve'

  // Base (Netlify hu-deploy root) → tumia '/'
  const rawBase = trimSlash(env.VITE_BASE || '/')
  const base    = isHttpUrl(rawBase) ? '/' : (rawBase || '/')

  // API (dev proxy)
  const RAW_API    = env.VITE_API_URL || env.API_URL || env.BACKEND_URL || 'http://localhost:8000'
  const API_TARGET = trimSlash(RAW_API)

  const plugins = [ vue({ reactivityTransform: false }), vueJsx(), UnoCSS() ]

  // Hiari: Vite DevTools
  if (toBool(env.VITE_DEVTOOLS, false)) {
    try { const { default: devtools } = await import('vite-plugin-vue-devtools'); plugins.push(devtools()) }
    catch { console.warn('[vite] vite-plugin-vue-devtools missing; skipping.') }
  }

  // ---------- Safe minify strategy ----------
  // Chagua kupitia env: VITE_MINIFY = 'terser' | 'esbuild' | 'none'
  const want = String(env.VITE_MINIFY || 'terser').toLowerCase()
  let MINIFY = want
  let terserOptions

  if (want === 'terser') {
    let terserAvailable = false
    try { await import('terser'); terserAvailable = true } catch {}
    if (terserAvailable) {
      MINIFY = 'terser'
      // ONDOA mangle ili kuepuka lexical-init bugs
      terserOptions = { mangle: false, compress: { passes: 2, drop_debugger: true, drop_console: false }, format: { comments: false } }
    } else {
      console.warn('[vite] terser not installed; switching to no minify.')
      MINIFY = false
    }
  } else if (want === 'none') {
    MINIFY = false
  } else if (want !== 'esbuild') {
    MINIFY = false
  }

  // ---------- Chunking mode ----------
  // VITE_CHUNKING = 'auto' (default, no manualChunks) | 'vendor' (split vendors)
  const CHUNKING = String(env.VITE_CHUNKING || 'auto').toLowerCase()
  const rollupOutput = {
    entryFileNames : 'assets/[name]-[hash].js',
    chunkFileNames : 'assets/[name]-[hash].js',
    assetFileNames : 'assets/[name]-[hash][extname]',
    ...(CHUNKING === 'vendor' ? { manualChunks: vendorChunks } : {}), // default hakuna manualChunks (salama)
  }

  return {
    base,
    plugins,

    resolve: {
      alias: {
        '@'          : fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@views'     : fileURLToPath(new URL('./src/views', import.meta.url)),
        '@assets'    : fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@utils'     : fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
      dedupe: ['vue', 'vue-router'],
    },

    envPrefix: ['VITE_', 'SB_'],
    define: {
      __APP_ENV__           : JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __APP_NAME__          : JSON.stringify(env.VITE_APP_NAME || 'SmartBiz Assistance'),
      __API_URL__           : JSON.stringify(API_TARGET),
      __DEV__               : JSON.stringify(!IS_PROD),
      __BUILD_TIME__        : JSON.stringify(new Date().toISOString()),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      open: false,
      hmr: { overlay: false },
      cors: true,
      proxy: { '/api': { target: API_TARGET, changeOrigin: true, secure: false } },
      watch: { usePolling: false, interval: 100 },
    },

    preview: { host: '0.0.0.0', port: 4173, strictPort: true },

    // Dev-only optimizer (sio build)
    optimizeDeps: {
      include: [
        'vue', 'vue-router', 'vue-i18n',
        'axios', '@vueuse/core',
        'vue-toastification', 'pinia',
        'hls.js', 'socket.io-client',
        'vue3-apexcharts'
      ],
      exclude: ['@vueuse/motion'],
      entries: ['./index.html'],
      esbuildOptions: {
        target: 'es2020',
        jsx: 'preserve',
        loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx' },
        tsconfigRaw: { compilerOptions: { jsx: 'preserve', useDefineForClassFields: false } },
      },
    },

    build: {
      outDir: 'dist',
      target: 'es2019',
      cssTarget: 'chrome90',
      sourcemap: true,               // iwe rahisi kuona stacktrace tukikwama
      brotliSize: false,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,
      minify: MINIFY,                // 'terser' | 'esbuild' | false
      terserOptions,
      rollupOptions: { output: rollupOutput },
      commonjsOptions: { transformMixedEsModules: true },
      emptyOutDir: true,
      modulePreload: { polyfill: false },
    },

    // Usiangushe console kwa sasa (inasaidia kusoma errors)
    esbuild: { drop: IS_PROD ? ['debugger'] : [] },
    worker: { format: 'es' },
    json: { stringify: true },
    css: { devSourcemap: false },
  }
})
