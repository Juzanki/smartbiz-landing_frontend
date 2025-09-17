// src/main.js — Boot imara kwa Vite + Vue 3
import { createApp, nextTick, watch } from 'vue'
import App from './App.vue'

// ───────── Styles ─────────
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'                   // collapse/modal, nk.
import './assets/main.css'

// ───────── i18n ─────────
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sw from './locales/sw.json'
import fr from './locales/fr.json'

function pickBrowserLang() {
  try {
    const saved = localStorage.getItem('user_lang')
    if (saved) return saved
  } catch {}
  const nav = String(navigator?.language || 'en').toLowerCase()
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

function applyLangDir(locale) {
  try {
    const rtl = new Set(['ar', 'fa', 'he', 'ur'])
    const html = document.documentElement
    html.setAttribute('lang', locale || 'en')
    html.setAttribute('dir', rtl.has((locale || 'en').slice(0, 2)) ? 'rtl' : 'ltr')
  } catch {}
}
applyLangDir(i18n.global.locale.value)
watch(() => i18n.global.locale.value, v => {
  try { localStorage.setItem('user_lang', v) } catch {}
  applyLangDir(v)
})

// ───────── Toasts ─────────
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent || '')
const toastOptions = {
  position: isMobile ? 'bottom-center' : 'top-right',
  timeout: 3500,
  draggable: true,
  maxToasts: 4,
}

// ───────── Chart.js (lazy) ─────────
let __ChartJS = null
async function ensureChartJs () {
  if (__ChartJS) return __ChartJS
  const mod = await import('chart.js')
  mod.Chart.register(...mod.registerables)
  __ChartJS = mod.Chart
  return __ChartJS
}

// ───────── Boot diagnostics ─────────
function showBootIssue (message, err) {
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `<div style="color:#f88;background:#111;padding:12px;border:1px solid #333;border-radius:8px;max-width:860px;margin:24px auto;font:14px system-ui">
      <b>Startup issue:</b> ${message || 'App did not mount.'}
      <div style="margin-top:8px;color:#ccc">${(err && (err.message || err)) || ''}</div>
      <div style="margin-top:8px;color:#888">Open DevTools → Console to view full stack trace.</div>
    </div>`
  }
  if (err) console.error('[BOOT ISSUE]', err)
}
window.addEventListener('error', e => showBootIssue('Window error', e.error || e.message))
window.addEventListener('unhandledrejection', e => showBootIssue('Unhandled promise rejection', e.reason || e))

// ───────── 100vh fix (mobile bars) ─────────
function setVH () {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVH()
window.addEventListener('resize', setVH, { passive: true })
window.addEventListener('orientationchange', setVH, { passive: true })

// ───────── App instance ─────────
const app = createApp(App)
app.use(i18n)
app.use(Toast, toastOptions)
app.provide('isMobile', isMobile)
app.provide('ensureChartJs', ensureChartJs)
app.config.globalProperties.$ensureChartJs = ensureChartJs
nextTick(() => { try { window.$toast = app.config.globalProperties.$toast || useToast() } catch {} })
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _i, info) => {
  if (import.meta.env.DEV) console.error('[AppError]', err, info)
  try { window.$toast?.error?.('Unexpected error') } catch {}
}

// ───────── Route helpers ─────────
function setRouteLoading (on) {
  try {
    on ? document.body.classList.add('route-loading') : document.body.classList.remove('route-loading')
  } catch {}
}

// ───────── Service Worker: ZIMWA (kuondoa cache ya HTML kama JS) ─────────
// Tusiajisajilie SW hadi utakapokuhitaji tena baada ya deploy kuwa safi.
// Pia jaribu kuvunja usajili wa zamani endapo upo (hasa baada ya kufuta sw.js).
if ('serviceWorker' in navigator) {
  // Ondoa SW zilizosajiliwa (safe no-op kama hakuna)
  navigator.serviceWorker.getRegistrations()
    .then(rs => rs.forEach(r => r.unregister()))
    .catch(() => {})
  // Futia caches zinazoweza kuwa zimehifadhi HTML kama JS
  if (window.caches?.keys) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
  }
}

// ───────── Mount + watchdog ─────────
;(async () => {
  // Ikiwa script ya router haipatikani au inapewa HTML, utaona ujumbe huu badala ya crash ya kimya.
  const watchdog = setTimeout(() => {
    if (!window.__APP_MOUNTED__) showBootIssue('App is taking longer than expected to start…')
  }, 6000)

  try {
    // Router via dynamic import
    let router = null
    try {
      // Muhimu: relative import hii huhandliwa na Vite wakati wa build → /assets/*.js
      router = (await import('./router/index.js')).default
      if (router) {
        router.beforeEach((to, _f, next) => {
          setRouteLoading(true)
          const base = 'SmartBiz'
          const t = i18n?.global?.t?.bind(i18n.global) || (k => k)
          const page = to.meta?.title ? t(to.meta.title) : ''
          try { document.title = page ? `${page} • ${base}` : base } catch {}
          next()
        })
        router.afterEach(() => setRouteLoading(false))
        app.use(router)
        if (router.isReady) {
          await router.isReady().catch(e => console.warn('router.isReady error:', e))
        }
      }
    } catch (e) {
      // Hapa mara nyingi ndipo MIME error hutokea (server imerudisha HTML kwa path ya js)
      console.error('Router failed to load:', e)
      showBootIssue('Router module failed to load. Check asset paths / redirects.', e)
    }

    app.mount('#app')
    window.__APP_MOUNTED__ = true
  } catch (err) {
    showBootIssue('Failed to mount the application.', err)
  } finally {
    clearTimeout(watchdog)
  }
})()
