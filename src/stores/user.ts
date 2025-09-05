// src/stores/user.ts
import { defineStore } from 'pinia'

/**
 * 🌍 Global, mobile-first user store
 * - Locale/Timezone/Currency aware (auto-detected, overrideable)
 * - Field normalization (handles snake_case from APIs)
 * - Versioned persistence with safe migrations
 * - Cross-tab sync (storage events)
 * - RTL language hint & formatting helpers
 * - Avoids storing access tokens in localStorage by default (safer)
 */

export interface RawUserData {
  id?: string | number
  username?: string
  display_name?: string
  full_name?: string
  email?: string
  phone?: string

  // avatars (any of these may come from backend)
  avatar?: string
  avatar_url?: string
  profile_image?: string
  profileImage?: string

  // profile/meta
  is_verified?: boolean
  verified?: boolean
  roles?: string[]
  badges?: string[]
  country?: string // ISO 3166-1 alpha-2, e.g., "TZ"
  language?: string // BCP 47, e.g., "en-US"
  time_zone?: string // IANA tz, e.g., "Africa/Dar_es_Salaam"
  currency?: string // ISO 4217, e.g., "TZS"

  created_at?: string
  updated_at?: string
}

export interface UserState {
  // housekeeping
  __version: number
  __loaded: boolean
  deviceId: string
  sessionId: string

  // identity
  id: string | number | null
  username: string
  displayNameOverride: string
  email: string
  phone: string

  // visuals
  profileImage: string
  isVerified: boolean
  roles: string[]
  badges: string[]

  // international prefs
  locale: string
  timeZone: string
  currency: string
  country?: string

  // tokens (kept in memory by default)
  accessToken: string | null
  refreshToken: string | null
}

const STORE_KEY = 'smartbiz:user:v2'  // bump when schema changes
const STORE_VERSION = 2

// ---- utils ----
const safeParse = <T = unknown>(s: string | null): T | null => {
  if (!s) return null
  try { return JSON.parse(s) as T } catch { return null }
}

const fromNavigator = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const lang = navigator?.language || 'en-US'
  return { tz, lang }
}
const defaultCurrencyFor = (country?: string, locale?: string) => {
  // Very light heuristic; override from server when available
  if (country === 'TZ') return 'TZS'
  if (country === 'KE') return 'KES'
  if (country === 'UG') return 'UGX'
  if (country === 'US') return 'USD'
  if (country === 'GB') return 'GBP'
  if (country === 'EU' || (locale || '').includes('-')) return 'EUR'
  return 'USD'
}
const uuid = () =>
  (crypto as any)?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

const isRTL = (locale: string) => /^ar|fa|he|ur/i.test(locale)

// Normalize server payload into our shape
const normalize = (raw: RawUserData) => {
  const {
    id = null,
    username = '',
    display_name,
    full_name,
    email = '',
    phone = '',
    avatar,
    avatar_url,
    profile_image,
    profileImage,

    verified,
    is_verified,
    roles = [],
    badges = [],
    country,
    language,
    time_zone,
    currency,
  } = raw || {}

  const display = display_name || full_name || username || ''
  const img = profileImage || profile_image || avatar_url || avatar || ''

  return {
    id,
    username,
    displayName: display,
    email,
    phone,
    profileImage: img,
    isVerified: Boolean(is_verified ?? verified ?? false),
    roles: Array.isArray(roles) ? roles : [],
    badges: Array.isArray(badges) ? badges : [],
    country: country || undefined,
    locale: language || undefined,
    timeZone: time_zone || undefined,
    currency: currency || undefined,
  }
}

// Migrate older persisted payloads → current schema
const migrate = (old: any): UserState | null => {
  if (!old || typeof old !== 'object') return null
  if (!('__version' in old)) {
    // v1 → v2
    const { tz, lang } = fromNavigator()
    return {
      __version: STORE_VERSION,
      __loaded: true,
      deviceId: old.deviceId || uuid(),
      sessionId: uuid(),

      id: old.id ?? null,
      username: old.username || '',
      displayNameOverride: old.displayNameOverride || '',
      email: old.email || '',
      phone: old.phone || '',

      profileImage: old.profileImage || '',
      isVerified: Boolean(old.is_verified ?? old.isVerified ?? false),
      roles: old.roles || [],
      badges: old.badges || [],

      locale: old.locale || lang,
      timeZone: old.timeZone || tz,
      currency: old.currency || defaultCurrencyFor(old.country, old.locale),
      country: old.country,

      accessToken: null,    // do not migrate tokens from LS
      refreshToken: null,
    }
  }
  // Already v2
  return { ...old, __version: STORE_VERSION }
}

export const useUserStore = defineStore('user', {
  state: (): UserState => {
    const { tz, lang } = fromNavigator()
    return {
      __version: STORE_VERSION,
      __loaded: false,
      deviceId: (safeParse<UserState>(localStorage.getItem(STORE_KEY))?.deviceId) || uuid(),
      sessionId: uuid(),

      id: null,
      username: '',
      displayNameOverride: '',
      email: '',
      phone: '',

      profileImage: '',
      isVerified: false,
      roles: [],
      badges: [],

      locale: lang,
      timeZone: tz,
      currency: defaultCurrencyFor(undefined, lang),
      country: undefined,

      accessToken: null,
      refreshToken: null,
    }
  },

  getters: {
    displayName: (s) =>
      s.displayNameOverride || s.username || (s.email ? s.email.split('@')[0] : '') || 'Guest',

    avatar: (s) => {
      if (s.profileImage) return s.profileImage
      // nice fallback: auto initials avatar (no external deps)
      const name = (s.displayName || 'Guest').trim()
      const initials = name.split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase()).join('') || 'G'
      // simple SVG data URL to avoid network calls
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
          <rect width='100%' height='100%' fill='#111827'/>
          <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle'
                font-family='Inter, system-ui, sans-serif' font-size='56' fill='#e5e7eb'>${initials}</text>
        </svg>`
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    },

    isRtl: (s) => isRTL(s.locale),

    // Currency/Date helpers (return functions to keep reactivity)
    formatCurrency: (s) => (amount: number, opts: Intl.NumberFormatOptions = {}) =>
      new Intl.NumberFormat(s.locale || 'en-US', { style: 'currency', currency: s.currency || 'USD', ...opts }).format(amount),

    formatDate: (s) => (date: string | number | Date, opts: Intl.DateTimeFormatOptions = {}) =>
      new Intl.DateTimeFormat(s.locale || 'en-US', { timeZone: s.timeZone || 'UTC', ...opts }).format(new Date(date)),

    hasRole: (s) => (role: string) => s.roles?.includes(role),

    minimalProfile: (s) => ({
      id: s.id,
      username: s.username,
      displayName: s.displayNameOverride || s.username,
      avatar: s.avatar,
      isVerified: s.isVerified,
      country: s.country,
    }),
  },

  actions: {
    /** Load from localStorage (with migration) */
    load() {
      const raw = localStorage.getItem(STORE_KEY)
      if (!raw) {
        this.__loaded = true
        return
      }
      const parsed = safeParse<UserState>(raw)
      const migrated = migrate(parsed) || this.$state
      this.$patch({ ...migrated, __loaded: true, sessionId: uuid() })
    },

    /** Persist (excluding volatile tokens) */
    persist() {
      const {
        accessToken, refreshToken, sessionId, ...rest
      } = this.$state
      localStorage.setItem(STORE_KEY, JSON.stringify(rest))
    },

    /** Normalize and set full user payload from API */
    setUser(data: RawUserData) {
      const n = normalize(data)
      const { tz, lang } = fromNavigator()
      this.$patch({
        id: n.id,
        username: n.username || this.username,
        displayNameOverride: n.displayName || this.displayNameOverride,
        email: this.email, // keep unless server sends it separately
        phone: this.phone,

        profileImage: n.profileImage || this.profileImage,
        isVerified: n.isVerified,
        roles: n.roles,
        badges: n.badges,

        locale: n.locale || this.locale || lang,
        timeZone: n.timeZone || this.timeZone || tz,
        currency: n.currency || this.currency || defaultCurrencyFor(n.country, n.locale),
        country: n.country || this.country,
      })
      this.persist()
    },

    /** Merge partial user updates (e.g., profile edit form) */
    patchUser(patch: Partial<RawUserData & { displayName?: string }>) {
      const n = normalize(patch as RawUserData)
      this.$patch({
        username: n.username ?? this.username,
        displayNameOverride: (patch as any).displayName ?? n.displayName ?? this.displayNameOverride,
        email: patch.email ?? this.email,
        phone: patch.phone ?? this.phone,
        profileImage: n.profileImage ?? this.profileImage,
        isVerified: n.isVerified ?? this.isVerified,
        roles: n.roles?.length ? n.roles : this.roles,
        badges: n.badges?.length ? n.badges : this.badges,
        locale: n.locale ?? this.locale,
        timeZone: n.timeZone ?? this.timeZone,
        currency: n.currency ?? this.currency,
        country: n.country ?? this.country,
      })
      this.persist()
    },

    setLocale(locale: string) {
      this.locale = locale
      this.persist()
      document.documentElement.lang = locale
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
    },

    setTimeZone(tz: string) {
      this.timeZone = tz
      this.persist()
    },

    setCurrency(code: string) {
      this.currency = code
      this.persist()
    },

    setProfileImage(url: string) {
      this.profileImage = url
      this.persist()
    },

    setVerified(v: boolean) {
      this.isVerified = v
      this.persist()
    },

    setRoles(roles: string[]) {
      this.roles = roles || []
      this.persist()
    },

    /** Tokens: keep in memory by default. Only persist refresh if you opt-in elsewhere. */
    setTokens(access?: string | null, refresh?: string | null) {
      this.accessToken = access ?? null
      this.refreshToken = refresh ?? null
    },

    /** Clear everything except deviceId; start a new sessionId */
    clearUser() {
      const keepDevice = this.deviceId
      this.$reset()
      this.deviceId = keepDevice
      this.sessionId = uuid()
      // keep navigator defaults
      const { tz, lang } = fromNavigator()
      this.locale = lang
      this.timeZone = tz
      this.currency = defaultCurrencyFor(this.country, this.locale)
      localStorage.removeItem(STORE_KEY)
    },

    /** Cross-tab sync: call once in app bootstrap */
    enableCrossTabSync() {
      window.addEventListener('storage', (e) => {
        if (e.key === STORE_KEY && e.newValue && e.newValue !== e.oldValue) {
          const parsed = safeParse<UserState>(e.newValue)
          const migrated = migrate(parsed)
          if (migrated) this.$patch({ ...migrated, sessionId: this.sessionId }) // keep this tab's sessionId
        }
      })
    },
  },
})
