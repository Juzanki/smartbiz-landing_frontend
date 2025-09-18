// src/i18n.js
// Vue 3 + vue-i18n v9 (composition API)

import { createI18n } from 'vue-i18n'

/* ────────────────────────────────────────────────────────────
   Utilities salama kwa browser/SSR
   ──────────────────────────────────────────────────────────── */
const safeGet = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const safeSet = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
const normalize = (l) => String(l || 'en').toLowerCase().replace(/_/g, '-')
const baseOf = (l) => normalize(l).split('-')[0]
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps'])

function applyHtmlAttrs (locale) {
  try {
    const html = document.documentElement
    html.lang = locale
    html.dir = RTL.has(baseOf(locale)) ? 'rtl' : 'ltr'
  } catch {}
}

function fromQueryString () {
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('lang') || url.searchParams.get('locale') || ''
  } catch { return '' }
}

/** Chagua lugha bora kutoka:
 * 1) ?lang=  2) localStorage  3) <html lang>  4) navigator.languages  5) 'en'
 */
function detectPreferredLocale () {
  const cand = [
    fromQueryString(),
    safeGet('user_lang'),
    (typeof document !== 'undefined' && document.documentElement.lang) || '',
    ...(navigator?.languages || [navigator?.language || ''])
  ].filter(Boolean)
  for (const c of cand) {
    const b = baseOf(c)
    if (b) return b
  }
  return 'en'
}

/* ────────────────────────────────────────────────────────────
   Pakia tafsiri: en & sw eager, zingine lazy
   ──────────────────────────────────────────────────────────── */
const lazyModules = import.meta.glob('./locales/*.json')                       // lazy
const eagerModules = import.meta.glob('./locales/{en,sw}.json', { eager: true }) // en, sw

const messages = {}
for (const path in eagerModules) {
  const mod = eagerModules[path]
  const code = path.match(/\.\/locales\/([a-z-]+)\.json$/i)[1].toLowerCase()
  messages[code] = mod.default || mod
}

/* ────────────────────────────────────────────────────────────
   Number & Datetime formats (defaults; unaweza kuzi-override)
   ──────────────────────────────────────────────────────────── */
const numberFormats = {
  en: {
    currency: { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' },
    percent:  { style: 'percent', maximumFractionDigits: 2 },
    decimal:  { style: 'decimal', maximumFractionDigits: 2 },
  },
  sw: {
    currency: { style: 'currency', currency: 'TZS', currencyDisplay: 'symbol' },
    percent:  { style: 'percent', maximumFractionDigits: 2 },
    decimal:  { style: 'decimal', maximumFractionDigits: 2 },
  },
}

const datetimeFormats = {
  en: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long:  { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    time:  { hour: '2-digit', minute: '2-digit' },
  },
  sw: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long:  { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    time:  { hour: '2-digit', minute: '2-digit' },
  },
}

/* ────────────────────────────────────────────────────────────
   I18n instance
   ──────────────────────────────────────────────────────────── */
const initial = messages[baseOf(detectPreferredLocale())] ? baseOf(detectPreferredLocale()) : 'en'

const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: 'en',
  messages,
  numberFormats,
  datetimeFormats,
  // punguza onyo kwenye prod; bado tu-andike console kwenye DEV ikikosa key
  warnHtmlMessage: false,
  missingWarn: false,
  fallbackWarn: false,
})

applyHtmlAttrs(initial)

/* ────────────────────────────────────────────────────────────
   Deep merge (fallback EN -> locale) kuzuia keys kukosekana
   ──────────────────────────────────────────────────────────── */
function deepMerge (target, src) {
  const out = Array.isArray(target) ? [...target] : { ...(target || {}) }
  for (const k of Object.keys(src || {})) {
    const v = src[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepMerge(out[k] || {}, v)
    else out[k] = v
  }
  return out
}

/* ────────────────────────────────────────────────────────────
   Loader ya lugha (lazy) + ulinzi dhidi ya mara nyingi + timeout
   ──────────────────────────────────────────────────────────── */
const inFlight = new Map() // code -> Promise
const LOAD_TIMEOUT_MS = 15000

async function loadLocaleFile (code) {
  const path = `./locales/${code}.json`
  const loader = lazyModules[path]
  if (!loader) return null

  // timeout + abort signal (best-effort; Vite dynamic import haiungi AbortController moja kwa moja)
  let timer
  const p = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('i18n:load-timeout')), LOAD_TIMEOUT_MS)
    Promise.resolve()
      .then(() => loader())
      .then((mod) => resolve(mod?.default || mod))
      .catch(reject)
  }).finally(() => clearTimeout(timer))

  return p
}

async function ensureLocaleMessages (code) {
  if (messages[code]) return messages[code]

  // usipakie mara mbili
  if (!inFlight.has(code)) {
    inFlight.set(code, (async () => {
      try {
        const data = await loadLocaleFile(code)
        if (!data) return (messages[code] = messages['en'] || {})
        const merged = deepMerge(messages['en'] || {}, data)
        messages[code] = merged
        i18n.global.setLocaleMessage(code, merged)
        return merged
      } finally {
        // acha kidogo kabla ya kutoa ili kuruhusu wito wa karibu utumie promise ileile
        setTimeout(() => inFlight.delete(code), 0)
      }
    })())
  }
  return inFlight.get(code)
}

/* ────────────────────────────────────────────────────────────
   Public API: loadLocaleAsync / setLocale / availableLocales
   ──────────────────────────────────────────────────────────── */
const listeners = new Set()
export function onLocaleChanged (fn) { listeners.add(fn); return () => listeners.delete(fn) }
function emitChanged (loc) { for (const fn of listeners) try { fn(loc) } catch {} }

export async function loadLocaleAsync (locale) {
  const wanted = baseOf(locale)
  await ensureLocaleMessages(wanted)

  // vue-i18n v9: global.locale ni Ref
  try { i18n.global.locale.value = wanted } catch { i18n.global.locale = wanted }
  applyHtmlAttrs(wanted)
  safeSet('user_lang', wanted)
  safeSet('language', wanted)
  emitChanged(wanted)
  return wanted
}

/** setLocale: jaribu kwanza locale kamili (mf. "sw-TZ") kisha base ("sw") */
export async function setLocale (loc) {
  const full = normalize(loc)
  const base = baseOf(loc)
  // jaribu full (ikiwa una faili ./locales/sw-tz.json utafaidika)
  if (full !== base) {
    const hasFull = !!lazyModules[`./locales/${full}.json`]
    if (hasFull) {
      await ensureLocaleMessages(full)
      try { i18n.global.locale.value = full } catch { i18n.global.locale = full }
      applyHtmlAttrs(full); safeSet('user_lang', full); safeSet('language', full); emitChanged(full)
      return full
    }
  }
  return loadLocaleAsync(base)
}

export function availableLocales () {
  const set = new Set(Object.keys(messages))
  Object.keys(lazyModules).forEach(p => {
    const m = p.match(/\.\/locales\/([a-z-]+)\.json$/i)
    if (m) set.add(m[1].toLowerCase())
  })
  return Array.from(set).sort()
}

/* ────────────────────────────────────────────────────────────
   Aliases rahisi kwa t/n/d (nje ya components)
   ──────────────────────────────────────────────────────────── */
export const t = (...args) => i18n.global.t(...args)
export const n = (value, fmt = 'decimal') => i18n.global.n(value, fmt)
export const d = (value, fmt = 'short') => i18n.global.d(value, fmt)

/* ────────────────────────────────────────────────────────────
   Dev helper: ripoti keys zinazokosekana (DEV tu)
   ──────────────────────────────────────────────────────────── */
if (import.meta.env.DEV) {
  i18n.global.missing = (locale, key) => {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] missing key "${key}" for locale "${locale}"`)
    // rudisha key yenyewe ili UI iendelee
    return key
  }
}

/* ────────────────────────────────────────────────────────────
   Export default
   ──────────────────────────────────────────────────────────── */
export default i18n
