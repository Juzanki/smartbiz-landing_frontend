// ========================= Core ============================
import { createApp, nextTick } from 'vue'
import App from './App.vue'
import router from './router'

// ========================= Styles ==========================
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'
// Acha hii kama umewasha UnoCSS kwenye Vite
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

// ======== Global Chart.js lazy-loader (salama kwa CI) =====
/**
 * Matumizi kutoka kokote:
 *   const Chart = await app.config.globalProperties.$ensureChartJs()
 */
let __ChartJS = null
async function ensureChartJs() {
  if (__ChartJS) return __ChartJS
  const mod = await import('chart.js')
  mod.Chart.register(...mod.registerables)
  __ChartJS = mod.Chart
  return __ChartJS
}

// =================== Boot Diagnostics ======================
function showBootIssue(message, err) {
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `
      <div style="
        color:#f88;background:#111;padding:12px;border:1px solid #333;
        border-radius:8px;max-width:860px;margin:24px auto;font:14px/1.45 system-ui;
        white-space:pre-wrap;overflow:auto;
      ">
        <b>Startup issue:</b> ${message || 'App did not mount.'}
        <div style="margin-top:8px;color:#ccc">${(err && (err.message || err)) || ''}</div>
        <div style="margin-top:8px;color:#888">Open DevTools → Console to view full stack trace.</div>
      </div>`
  }
  if (err) console.error('[BOOT ISSUE]', err)
}

// Wikamata makosa ya dunia nzima kabla ya mount
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => showBootIssue('Window error', e.error || e.message))
  window.addEventListener('unhandledrejection', (e) => showBootIssue('Unhandled promise rejection', e.reason || e))
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
app.use(VueApexCharts) // <apexchart> globally

// ---------- Handy directives ----------
app.directive('autofocus', {
  mounted(el) { try { el.focus() } catch {} },
})

// Provide / globals
app.provide('isMobile', isMobile)
app.provide('ensureChartJs', ensureChartJs)
app.config.globalProperties.$ensureChartJs = ensureChartJs

// Ruhusu utilities kupata $toast nje ya components
nextTick(() => {
  try {
    window.$toast = app.config.globalProperties.$toast || useToast()
  } catch {}
})

// ======== Vue error handler (toast + console) =============
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _instance, info) => {
  if (import.meta.env.DEV) console.error('[AppError]', err, info)
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const msg = t('errors.unexpected') || 'Unexpected error'
  try { window.$toast?.error?.(msg) } catch {}
}

// ======= Route title + route-loading indicator =============
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

// ===== Service Worker (optional, prod only) ================
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  const swUrl = '/sw.js'
  fetch(swUrl, { method: 'HEAD' })
    .then((r) => { if (r.ok) navigator.serviceWorker.register(swUrl).catch(() => {}) })
    .catch(() => {})
}

// ================ Mount + Watchdog =========================
;(async () => {
  // Watchdog: kama haijamount ndani ya 6s, onyesha tahadhari (bila kusimamisha app)
  const watchdog = setTimeout(() => {
    if (!window.__APP_MOUNTED__) {
      showBootIssue('App is taking longer than expected to start…')
    }
  }, 6000)

  try {
    // router.isReady() hurekebisha hydration timing kwenye SPA
    await router.isReady()
    app.mount('#app')
    window.__APP_MOUNTED__ = true
  } catch (err) {
    showBootIssue('Failed to mount the application.', err)
  } finally {
    clearTimeout(watchdog)
  }
})()
