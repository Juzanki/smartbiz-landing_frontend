// src/i18n.js
// ── Vue 3 + vue-i18n v9 (composition) ───────────────────────────────────
import { createI18n } from 'vue-i18n'

/* ----------------- Utils salama kwa browser/SSR ----------------- */
const safeGet = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const safeSet = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
const normalize = (l) => String(l || 'en').toLowerCase().replace('_', '-')
const baseOf = (l) => normalize(l).split('-')[0]
const RTL = new Set(['ar', 'he', 'fa', 'ur'])

function applyHtmlAttrs (locale) {
  try {
    const html = document.documentElement
    html.lang = locale
    html.dir = RTL.has(baseOf(locale)) ? 'rtl' : 'ltr'
  } catch {}
}

/* ----------------- Pakua tafsiri: en/sw eager, zingine lazy -------- */
const lazyModules = import.meta.glob('./locales/*.json')               // lazy
const eagerModules = import.meta.glob('./locales/{en,sw}.json', { eager: true }) // en & sw zipo mara moja

const messages = {}
for (const path in eagerModules) {
  const m = eagerModules[path]
  const code = path.match(/\.\/locales\/([a-z-]+)\.json$/i)[1].toLowerCase()
  messages[code] = m.default || m
}

/* ----------------- Chagua lugha ya kuanzia ------------------------ */
const preferred =
  normalize(
    safeGet('user_lang') ||
    safeGet('language') ||
    (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) ||
    'en'
  )

const initial = messages[baseOf(preferred)] ? baseOf(preferred) : 'en'

/* ----------------- I18n instance ---------------------------------- */
const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: 'en',
  messages,
  // punguza kelele za onyo kwenye prod
  warnHtmlMessage: false,
  missingWarn: false,
  fallbackWarn: false,
})

applyHtmlAttrs(initial)

/* ----------------- Deep merge kwa fallback (en -> lang) ----------- */
function deepMerge (target, src) {
  const out = Array.isArray(target) ? [...target] : { ...(target || {}) }
  for (const k of Object.keys(src || {})) {
    const v = src[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] || {}, v)
    } else {
      out[k] = v
    }
  }
  return out
}

/* ----------------- Loader ya lugha (lazy) ------------------------- */
async function loadLocaleAsync (locale) {
  const wanted = baseOf(locale)
  // tayari ipo?
  if (i18n.global.locale === wanted && i18n.global.availableLocales.includes(wanted)) {
    return wanted
  }

  // kama haijawahi kupakiwa, jaribu kuipakua
  if (!i18n.global.availableLocales.includes(wanted)) {
    const path = `./locales/${wanted}.json`
    const loader = lazyModules[path]
    if (loader) {
      try {
        const mod = await loader()
        const data = mod.default || mod
        // merge na en kama fallback
        const merged = deepMerge(messages.en || {}, data)
        messages[wanted] = merged
        i18n.global.setLocaleMessage(wanted, merged)
      } catch {
        // acha tu—tutabaki na en kama fallback
      }
    }
  }

  i18n.global.locale = wanted
  applyHtmlAttrs(wanted)
  safeSet('user_lang', wanted)
  safeSet('language', wanted)
  return wanted
}

/* ----------------- Orodha ya lugha zinazopatikana ------------------ */
function availableLocales () {
  const set = new Set(Object.keys(messages))
  Object.keys(lazyModules).forEach(p => {
    const m = p.match(/\.\/locales\/([a-z-]+)\.json$/i)
    if (m) set.add(m[1].toLowerCase())
  })
  return Array.from(set).sort()
}

/* ----------------- Exports ---------------------------------------- */
export { loadLocaleAsync, availableLocales, applyHtmlAttrs }
export default i18n
