// vite.config.js — SmartBiz (Vue 3 + Vite + Netlify)
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/* ---------------------- Helpers ---------------------- */
const trimRightSlash = (u) => String(u || '').replace(/\/+$/, '')
const isHttp = (u) => /^https?:\/\//i.test(String(u || ''))
const toBool = (v, d = false) =>
  v === true || v === 'true' ? true : v === false || v === 'false' ? false : d

/** Optional vendor chunking */
function vendorChunks(id) {
  if (!id || !id.includes('node_modules')) return
  const tail = id.split('node_modules/')[1] || ''
  const scope = tail.startsWith('@') ? tail.split('/').slice(0, 2).join('/') : tail.split('/')[0]
  if (/^vue($|\/)|vue-router/.test(scope)) return 'vue'
  if (/(apexcharts|chart\.js)/.test(scope)) return 'charts'
  if (/@?unocss|@vueuse|axios|pinia|vue-i18n/.test(scope)) return 'utils'
  return 'vendor'
}

/* ---------------------- Config ----------------------- */
export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '') // soma .env* zote
  const IS_PROD = mode === 'production'
  const IS_SERVE = command === 'serve'

  // API root (BILA /api). Mfano: https://smartbiz-backend-lp9u.onrender.com
  const API_ROOT = trimRightSlash(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')

  // Base ya app (Netlify hu-deploy kwenye root, hivyo '/')
  const base = '/'

  // Plugins za lazima
  const plugins = [vue({ reactivityTransform: false })]

  // (Hiari) Vue JSX
  try {
    const { default: vueJsx } = await import('@vitejs/plugin-vue-jsx')
    plugins.push(vueJsx())
  } catch { /* hakuna -> ruka */ }

  // (Hiari) UnoCSS
  try {
    const { default: UnoCSS } = await import('unocss/vite')
    plugins.push(UnoCSS())
  } catch { /* hakuna -> ruka */ }

  // (Hiari) Vite DevTools
  if (toBool(env.VITE_DEVTOOLS, false)) {
    try {
      const { default: devtools } = await import('vite-plugin-vue-devtools')
      plugins.push(devtools())
    } catch { /* hakuna -> ruka */ }
  }

  // Minify strategy: VITE_MINIFY = 'terser' | 'esbuild' | 'none'
  const wantMin = String(env.VITE_MINIFY || 'terser').toLowerCase()
  let minify = false
  let terserOptions

  if (wantMin === 'esbuild') {
    minify = 'esbuild'
  } else if (wantMin === 'terser') {
    try {
      await import('terser')
      minify = 'terser'
      // ONDOA mangle ili kuepuka makosa ya lexical init
      terserOptions = {
        mangle: false,
        compress: { passes: 2, drop_debugger: true, drop_console: false },
        format: { comments: false },
      }
    } catch {
      minify = false
    }
  } // 'none' => false

  // Chunking: VITE_CHUNKING = 'auto' | 'vendor'
  const chunking = String(env.VITE_CHUNKING || 'auto').toLowerCase()
  const rollupOutput = {
    entryFileNames: 'assets/[name]-[hash].js',
    chunkFileNames: 'assets/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]',
    ...(chunking === 'vendor' ? { manualChunks: vendorChunks } : {}),
  }

  return {
    base,
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
      // Tumia __API_ROOT__ ndani ya app yako (mfano axios baseURL)
      __API_ROOT__: JSON.stringify(API_ROOT),
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      open: false,
      hmr: { overlay: false },
      cors: true,
      // Dev proxy: umoje safi—frontend itapiga /api/... na kuelekezwa API_ROOT
      proxy: {
        '/api': {
          target: API_ROOT,
          changeOrigin: true,
          secure: false,
        },
      },
      watch: { usePolling: false, interval: 100 },
    },

    preview: { host: '0.0.0.0', port: 4173, strictPort: true },

    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'axios',
        '@vueuse/core',
        // ongeza packages zako muhimu hapa ukitaka dev kuwa mwepesi
      ],
      entries: ['./index.html'],
      esbuildOptions: {
        target: 'es2020',
        jsx: 'preserve',
        loader: { '.ts': 'ts', '.tsx': 'tsx', '.jsx': 'jsx' },
        tsconfigRaw: { compilerOptions: { jsx: 'preserve', useDefineForClassFields: false } },
      },
    },

    build: {
      outDir: 'dist',
      target: 'es2019',
      cssTarget: 'chrome90',
      sourcemap: true,
      brotliSize: false,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,
      minify,
      terserOptions,
      rollupOptions: { output: rollupOutput },
      commonjsOptions: { transformMixedEsModules: true },
      emptyOutDir: true,
      modulePreload: { polyfill: false },
    },

    esbuild: { drop: IS_PROD ? ['debugger'] : [] },
    worker: { format: 'es' },
    json: { stringify: true },
    css: { devSourcemap: false },
  }
})
