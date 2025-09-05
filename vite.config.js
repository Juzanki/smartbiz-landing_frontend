// vite.config.mjs (or keep as vite.config.js since "type":"module")
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import path from 'node:path'
import process from 'node:process'

// ---------- Small helpers ----------
/** Trim trailing slashes: "http://127.0.0.1:8000/" -> "http://127.0.0.1:8000" */
const trimSlash = (u) => (typeof u === 'string' ? u.replace(/\/+$/, '') : '')
/** True if looks like absolute http(s) url */
const isHttpUrl = (u) => /^https?:\/\//i.test(u || '')

export default defineConfig(({ mode, command }) => {
  // Load all envs (no VITE_ prefix filter so we can read fallbacks too)
  const env = loadEnv(mode, process.cwd(), '')

  // ---------- Base & API ----------
  const RAW_API =
    env.VITE_API_URL ||
    env.API_URL ||
    env.BACKEND_URL ||
    'http://localhost:8000'

  const API_TARGET = trimSlash(RAW_API)
  const BASE = trimSlash(env.VITE_BASE || '/')

  const IS_SERVE = command === 'serve'
  const IS_PROD = mode === 'production'

  // Guard: if someone sets VITE_BASE to a full URL, force it to path
  const normalizedBase = isHttpUrl(BASE) ? '/' : (BASE || '/')

  // ---------- Friendly console banner ----------
  console.log('\n🔧 SmartBiz Vite config')
  console.log('  MODE      :', mode)
  console.log('  BASE      :', normalizedBase)
  console.log('  API       :', API_TARGET)
  console.log('  DEV?      :', IS_SERVE, '\n')

  return {
    // App base path (supports hosting under a subfolder)
    base: normalizedBase,

    // ---------- Plugins ----------
    plugins: [
      vue({
        // Reactivity transform is deprecated in Vue 3.5+; keep off
        reactivityTransform: false,
        // Enable defineModel/props destructure if needed later:
        // script: { defineModel: true, propsDestructure: true },
      }),
      UnoCSS(),
      // If you use Vue DevTools, uncomment next line (already in your devDeps)
      // (await import('vite-plugin-vue-devtools')).default(),
    ],

    // ---------- Resolve / Aliases ----------
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@components': path.resolve(process.cwd(), 'src/components'),
        '@views': path.resolve(process.cwd(), 'src/views'),
        '@assets': path.resolve(process.cwd(), 'src/assets'),
        '@utils': path.resolve(process.cwd(), 'src/utils'),
      },
      // Prevent duplicate Vue instances if some deps bundle their own
      dedupe: ['vue'],
    },

    // Only expose these env prefixes to client code via import.meta.env
    envPrefix: ['VITE_', 'SB_'],

    // ---------- Global constants ----------
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'SmartBiz Assistance'),
      __API_URL__: JSON.stringify(API_TARGET),
    },

    // ---------- Dev Server (fast + mobile friendly) ----------
    server: {
      host: '0.0.0.0',           // test on real devices over LAN
      port: 5173,
      strictPort: true,
      open: false,
      // Clean overlay; keep errors in terminal (useful on mobile demos)
      hmr: { overlay: false },
      // CORS: allow from known public hosts if provided
      cors: {
        origin: [
          env.RAILWAY_PUBLIC_URL,
          env.NETLIFY_PUBLIC_URL,
          env.VERCEL_URL && `https://${env.VERCEL_URL}`,
          env.VITE_PUBLIC_ORIGIN,
        ].filter(Boolean).map(trimSlash),
        credentials: true,
      },
      // Proxy API & WS without CORS pain in dev
      proxy: {
        // Example: frontend calls fetch('/api/...') -> backend
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
          // If your backend does NOT have /api prefix, enable rewrite:
          // rewrite: (p) => p.replace(/^\/api/, ''),
        },
        // Example Socket.IO / WS (uncomment if you use it)
        // '/socket.io': { target: API_TARGET, ws: true, changeOrigin: true },
      },
      // Windows/VMs sometimes miss file change events—enable polling if needed
      watch: {
        usePolling: false, // set true if HMR seems unreliable
        interval: 100,
      },
    },

    // ---------- Preview (vite preview) ----------
    preview: {
      port: 4173,
      strictPort: true,
      host: '0.0.0.0',
    },

    // ---------- Dependency pre-bundle (faster HMR) ----------
    optimizeDeps: {
      include: ['vue', 'vue-router', 'axios', '@vueuse/core'],
      // If a heavy lib causes slow pre-bundling, exclude it:
      // exclude: ['apexcharts'],
      entries: ['./index.html'],
      esbuildOptions: {
        // Helps old Android WebViews if you ever test them
        target: 'es2019',
      },
    },

    // ---------- Build (modern mobile tuned) ----------
    build: {
      target: ['es2019', 'chrome90', 'safari14'],
      cssTarget: 'chrome90',
      sourcemap: false,
      brotliSize: false,
      assetsInlineLimit: 4096,        // inline tiny assets for fewer requests
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1100,

      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          // Stable vendor chunking for cache hits
          manualChunks: {
            vue: ['vue', 'vue-router'],
            vendor: ['axios', '@vueuse/core'],
          },
        },
      },

      // esbuild is super fast; use terser only if you need special minification
      minify: 'esbuild',
      // commonjsOptions: { ... } // if you have legacy CJS libs later
    },

    // ---------- Esbuild passes ----------
    esbuild: {
      // Trim noisy logs in prod
      drop: IS_PROD ? ['console', 'debugger'] : [],
    },

    // ---------- Web Workers (ready for future use) ----------
    worker: { format: 'es' },

    // Deterministic JSON order across machines/CI
    json: { stringify: true },
  }
})
