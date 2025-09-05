// src/main.js
// ========================= Core ============================
import { createApp, nextTick } from 'vue'
import App from './App.vue'
import router from './router'

// ========================= Styles ==========================
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'
// Acha hii ikiwa unatumia UnoCSS (ipo kwenye devDependencies zako)
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
  const nav = String(navigator.language || 'en').toLowerCase()
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

const toastOptions = {
  position: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 'bottom-center'
    : 'top-right',
  timeout: 3500,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  maxToasts: 4,
  newestOnTop: true,
}

// ================== ApexCharts (global) ====================
import VueApexCharts from 'vue3-apexcharts'

// ================ Mobile 100vh fix =========================
function setVH() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVH()
window.addEventListener('resize', setVH, { passive: true })
window.addEventListener('orientationchange', setVH, { passive: true })

// ======= Online/Offline user feedback (toasts + class) =====
const netToast = {
  online() {
    document.body.classList.remove('offline')
    try { window.$toast?.success?.('You are back online ✓') } catch {}
  },
  offline() {
    document.body.classList.add('offline')
    try { window.$toast?.warning?.('You are offline. Some features may pause.') } catch {}
  },
}
window.addEventListener('online', netToast.online)
window.addEventListener('offline', netToast.offline)

// ========================= App =============================
const app = createApp(App)
app.use(router)
app.use(i18n)
app.use(Toast, toastOptions)
app.use(VueApexCharts) // <apexchart> sasa inapatikana global

// ---------- Directives ndogo zenye manufaa -----------
app.directive('autofocus', {
  mounted(el) { try { el.focus() } catch {} },
})

// Weka toast ipatikane hata nje ya components (kwa error handlers/utilities)
try {
  // Mara nyingine $toast huwekwa baada ya mount; tuhakikishe ipo.
  nextTick(() => {
    // eslint-disable-next-line no-undef
    window.$toast = app.config.globalProperties.$toast || useToast()
  })
} catch {}

// ======== Vue error handler (inayoonyesha toast) ===========
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _instance, info) => {
  if (import.meta.env.DEV) console.error('[AppError]', err, info)
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const msg = t('errors.unexpected') || 'Unexpected error'
  try { window.$toast?.error?.(msg) } catch {}
}

// ======= Window errors & promise rejections (global) =======
window.addEventListener('error', (e) => {
  if (import.meta.env.DEV) console.error('[WindowError]', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  if (import.meta.env.DEV) console.error('[UnhandledRejection]', e.reason)
  try { window.$toast?.error?.('Something went wrong') } catch {}
})

// ======= Update <title> + onyesha "route-loading" class =====
router.beforeEach((to, _from, next) => {
  document.body.classList.add('route-loading')
  const base = 'SmartBiz'
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const page = to.meta?.title ? t(to.meta.title) : ''
  document.title = page ? `${page} • ${base}` : base
  next()
})
router.afterEach(() => {
  // toa class baada ya frame moja ili CSS animations zifanye kazi vizuri
  requestAnimationFrame(() => document.body.classList.remove('route-loading'))
})

// ========== Optional: register Service Worker (prod) ========
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const swUrl = '/sw.js'
  fetch(swUrl, { method: 'HEAD' })
    .then((r) => { if (r.ok) navigator.serviceWorker.register(swUrl).catch(() => {}) })
    .catch(() => {})
}

// ================ Mount after router ready =================
router.isReady().then(() => {
  app.mount('#app')
})
