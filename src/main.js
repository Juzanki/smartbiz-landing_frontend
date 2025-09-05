// src/main.js
// ========================= Core ============================
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// ========================= Styles ==========================
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'
// Acha hii tu kama unatumia UnoCSS; vinginevyo ifute.
import 'virtual:uno.css'

// ========================= i18n ============================
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sw from './locales/sw.json'
import fr from './locales/fr.json'

function pickBrowserLang () {
  try {
    const saved = localStorage.getItem('user_lang')
    if (saved) return saved
  } catch {}
  const nav = String((navigator.language || 'en')).toLowerCase()
  if (nav.startsWith('sw')) return 'sw'
  if (nav.startsWith('fr')) return 'fr'
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: pickBrowserLang(),
  fallbackLocale: 'en',
  messages: { en, sw, fr }
})

// ===================== Toasts (UX) =========================
import Toast from 'vue-toastification'
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
  newestOnTop: true
}

// =================== Mobile 100vh fix ======================
function setVH () {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVH()
window.addEventListener('resize', setVH, { passive: true })
window.addEventListener('orientationchange', setVH, { passive: true })

// ========== Online/Offline user feedback (toasts) ==========
const netToast = {
  online () {
    try { window.$toast?.success?.('You are back online ✓') } catch {}
  },
  offline () {
    try { window.$toast?.warning?.('You are offline. Some features may pause.') } catch {}
  }
}
window.addEventListener('online', netToast.online)
window.addEventListener('offline', netToast.offline)

// ========================= App =============================
const app = createApp(App)
app.use(router)
app.use(i18n)
app.use(Toast, toastOptions)

// Weka toast ipatikane hata nje ya components (kwa error handlers n.k.)
try {
  window.$toast = app.config.globalProperties.$toast
} catch {}

// ======== Vue error handler (inayoonyesha toast) ===========
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _instance, info) => {
  // Logu ya dev
  if (import.meta.env.DEV) console.error('[AppError]', err, info)
  // Ujumbe wa urafiki kwa mtumiaji
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const msg = t('errors.unexpected') || 'Unexpected error'
  try { window.$toast?.error?.(msg) } catch {}
}

// ========== Global window error & promise rejection =========
window.addEventListener('error', (e) => {
  if (import.meta.env.DEV) console.error('[WindowError]', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  if (import.meta.env.DEV) console.error('[UnhandledRejection]', e.reason)
  try { window.$toast?.error?.('Something went wrong') } catch {}
})

// ======= Update <title> from route.meta.title + i18n =======
router.beforeEach((to, _from, next) => {
  const base = 'SmartBiz'
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const page = to.meta?.title ? t(to.meta.title) : ''
  document.title = page ? `${page} • ${base}` : base
  next()
})

// ========== Optional: register Service Worker (prod) ========
if ('serviceWorker' in navigator) {
  const swUrl = '/sw.js'
  // Sajili tu production ili kuepuka mkanganyiko wakati wa dev
  if (import.meta.env.PROD) {
    fetch(swUrl, { method: 'HEAD' })
      .then(r => { if (r.ok) navigator.serviceWorker.register(swUrl).catch(() => {}) })
      .catch(() => {})
  }
}

// ================ Mount after router ready =================
router.isReady().then(() => {
  app.mount('#app')
})
