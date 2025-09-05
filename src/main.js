// ================= Core Vue App Bootstrap =================
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// ================= CSS (Bootstrap + your globals) =========
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'
// UnoCSS (kama umetumia):
import 'virtual:uno.css'

// =================== Multilingual (vue-i18n) ==============
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sw from './locales/sw.json'
import fr from './locales/fr.json'

const pickBrowserLang = () => {
  try {
    const saved = localStorage.getItem('user_lang')
    if (saved) return saved
  } catch {}
  const nav = (navigator.language || 'en').toLowerCase()
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

// =================== Toast Notifications ==================
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Mobile-friendly toast defaults
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

// =============== Optional: Axios (mobile-friendly) =========
// import axios from 'axios'
// export const api = axios.create({ baseURL: '/api', withCredentials: true })
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('access_token')
//   if (token) config.headers.Authorization = `Bearer ${token}`
//   return config
// })

// ================= Mobile 100vh fix ========================
// CSS: body { min-height: calc(var(--vh, 1vh) * 100); }
const setVH = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVH()
window.addEventListener('resize', setVH, { passive: true })
window.addEventListener('orientationchange', setVH, { passive: true })

// ================== Online / Offline toasts =================
const netToast = {
  showOnline: () => {
    try { window.$toast?.success?.('You are back online ✓') } catch {}
  },
  showOffline: () => {
    try { window.$toast?.warning?.('You are offline. Some features may pause.') } catch {}
  },
}
window.addEventListener('online',  netToast.showOnline)
window.addEventListener('offline', netToast.showOffline)

// =============== Create App & Global handlers ==============
const app = createApp(App)
app.use(router)
app.use(i18n)
app.use(Toast, toastOptions)

// expose toast globally for non-component contexts (e.g. errorHandler)
try {
  // After plugin registration, vue-toastification sets $toast on globalProperties
  // We also mirror to window for utility handlers.
  // eslint-disable-next-line no-undef
  window.$toast = app.config.globalProperties.$toast || useToast()
} catch {}

// Better DX on dev + graceful runtime errors
app.config.performance = import.meta.env.DEV
app.config.errorHandler = (err, _instance, info) => {
  // eslint-disable-next-line no-console
  console.error('[AppError]', err, info)
  const t = i18n?.global?.t?.bind(i18n.global) || ((k) => k)
  const msg = t('errors.unexpected') || 'Unexpected error'
  try { window.$toast?.error?.(msg) } catch {}
}

// =============== Optional: register Service Worker =========
if ('serviceWorker' in navigator) {
  // Register only in production & when sw exists
  const swUrl = '/sw.js'
  fetch(swUrl, { method: 'HEAD' })
    .then((r) => {
      if (r.ok && import.meta.env.PROD) {
        navigator.serviceWorker.register(swUrl).catch(() => {})
      }
    })
    .catch(() => {})
}

// =============== Small dev niceties ========================
// Avoid noisy errors for redundant navigations in dev consoles
if (import.meta.env.DEV) {
  const _warn = console.warn
  console.warn = (...args) => {
    const msg = String(args?.[0] || '')
    if (msg.includes('Avoided redundant navigation')) return
    _warn(...args)
  }
}

// =============== Mount after router is ready ===============
router.isReady().then(() => {
  app.mount('#app')
})
