// src/main.js
// ========================= Core ============================
import { createApp, nextTick } from 'vue'
import App from './App.vue'
import router from './router'

// ========================= Styles ==========================
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'
// Keep this if UnoCSS is configured in Vite
import 'virtual:uno.css'

// ========================= i18n ============================
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sw from './locales/sw.json'
import fr from './locales/fr.json'

function pickBrowserLang() {
  try {
    const saved = localStorage.getItem('user_lang')
    if (saved) return saved
  } catch {}
  const nav = String((typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en').toLowerCase()
  if (nav.startsWith('sw')) return 'sw'
  if (nav.startsWith('fr')) return 'fr'
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: pickBrowserLang(),
  fallbackLocale: 'en',
  messages: { en, sw, fr },
})

// ===================== Toasts (UX) =========================
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const isMobile = /Android|iPhone|iPad|iPod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
)

const toastOptions = {
  position: isMobile ? 'bottom-center' : 'top-right',
  timeout: 3500,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  maxToasts: 4,
  newestOnTop: true,
}

// ================== ApexCharts (global) ====================
import VueApexCharts from 'vue3-apexcharts'

// ======== Global Chart.js lazy-loader (safe for CI) ========
/**
 * Use from any component (Option A):
 *   const Chart = await app.config.globalProperties.$ensureChartJs()
 *
 * Or with provide/inject (Option B):
 *   const ensureChartJs = inject('ensureChartJs')
 *   const Chart = await ensureChartJs()
 *
 * We import 'chart.js' (not 'chart.js/auto') to avoid resolver issues.
 */
let __ChartJS = null
async function ensureChartJs() {
  if (__ChartJS) return __ChartJS
  const mod = await import('chart.js')
  mod.Chart.register(...mod.registerables)
  __ChartJS = mod.Chart
  return __ChartJS
}

// ================ Mobile 100vh fix =========================
function setVH() {
  if (typeof window === 'undefined') return
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVH()
if (typeof window !== 'undefined') {
  window.addEventListener('resize', setVH, { passive: true })
  window.addEventListener('orientationchange', setVH, { passive: true })
}

// ======= Online/Offline user feedback (toasts + class) =====
const netToast = {
  online() {
    if (typeof document !== 'undefined') document.body.classList.remove('offline')
    try { window.$toast?.success?.('You are back online ✓') } catch {}
  },
  offline() {
    if (typeof document !== 'undefined') document.body.classList.add('offline')
    try { window.$toast?.warning?.('You are offline. Some features may pause.') } catch {}
  },
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', netToast.online)
  window.addEventListener('offline', netToast.offline)
}

// ========================= App =============================
const app = createApp(App)
app.use(router)
app.use(i18n)
app.use(Toast, toastOptions)
app.use(VueApexCharts) // <apexchart> is now globally available

// ---------- Handy directives ----------
app.directive('autofocus', {
  mounted(el) { try { el.focus() } catch {} },
})

// Provide globals
app.provide('isMobile', isMobile)
app.provide('ensureChartJs', ensureChartJs)
app.config.globalProperties.$ensureChartJs = ensureChartJs

// Make $toast available outside components (utilities/handlers)
nextTick(() => {
  try {
    // In some setups $toast attaches after mount; ensure a fallback.
    window.$toast = app.config.globalProperties.$toast || useToast()
  } catch {}
})

// ======== Vue error handler (shows toast in prod) ==========
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _instance, info) => {
  if (import.meta.env.DEV) console.error('[AppError]', err, info)
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const msg = t('errors.unexpected') || 'Unexpected error'
  try { window.$toast?.error?.(msg) } catch {}
}

// ======= Window errors & promise rejections (global) =======
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (import.meta.env.DEV) console.error('[WindowError]', e.error || e.message)
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (import.meta.env.DEV) console.error('[UnhandledRejection]', e.reason)
    try { window.$toast?.error?.('Something went wrong') } catch {}
  })
}

// ======= Update <title> + route-loading class ===============
router.beforeEach((to, _from, next) => {
  if (typeof document !== 'undefined') document.body.classList.add('route-loading')
  const base = 'SmartBiz'
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const page = to.meta?.title ? t(to.meta.title) : ''
  if (typeof document !== 'undefined') {
    document.title = page ? `${page} • ${base}` : base
  }
  next()
})
router.afterEach(() => {
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      try { document.body.classList.remove('route-loading') } catch {}
    })
  }
})

// ========== Optional: register Service Worker (prod) ========
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  const swUrl = '/sw.js'
  fetch(swUrl, { method: 'HEAD' })
    .then((r) => { if (r.ok) navigator.serviceWorker.register(swUrl).catch(() => {}) })
    .catch(() => {})
}

// ================ Mount after router ready =================
router.isReady().then(() => {
  app.mount('#app')
})
