// src/stores/auth.js
/* eslint-disable no-console */
import { reactive, computed } from 'vue'

/**
 * 🌍 SmartBiz Auth Store (mobile-first, global-ready)
 * - Access token hukaa MEMORY by default (salama zaidi kwa SPA)
 * - "remember": 'memory' | 'session' | 'local' (optional persistence)
 * - Auto-refresh kabla ya expiry ikiwa una refresh handler
 * - Cross-tab sync (storage + BroadcastChannel)
 * - JWT-aware (exp, iat, roles/permissions kutoka claims)
 * - Role & permission helpers + route guards
 * - Optional axios wiring (request header + 401 refresh)
 */

const STORAGE_KEYS = {
  persist: 'auth:persist',           // memory | session | local
  access:  'auth:access',
  refresh: 'auth:refresh',
  role:    'auth:role',
  perms:   'auth:perms',
}

const state = reactive({
  // tokens (default: memory only)
  accessToken: null,
  refreshToken: null,

  // derived (JWT)
  exp: null,               // unix seconds
  iat: null,

  // authZ
  userRole: 'guest',
  permissions: [],

  // persistence mode
  persistMode: 'memory',   // 'memory' | 'session' | 'local'

  // lifecycle
  lastRefreshedAt: 0,
  refreshing: false,
})

let refreshHandler = null   // async () => ({ accessToken, refreshToken? })
let revokeHandler  = null   // async () => void
let refreshTimer   = null
let bc = null               // BroadcastChannel (if supported)

/* -------------- small utils -------------- */
const decodeJwt = (t) => {
  try {
    const p = t.split('.')[1]
    const json = decodeURIComponent(
      atob(p).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(json)
  } catch { return null }
}
const nowSec = () => Math.floor(Date.now() / 1000)

const getStorage = () => {
  if (state.persistMode === 'session') return sessionStorage
  if (state.persistMode === 'local') return localStorage
  return null // memory only
}

const persistWrite = () => {
  const store = getStorage()
  if (!store) return
  state.accessToken  ? store.setItem(STORAGE_KEYS.access, state.accessToken) : store.removeItem(STORAGE_KEYS.access)
  state.refreshToken ? store.setItem(STORAGE_KEYS.refresh, state.refreshToken) : store.removeItem(STORAGE_KEYS.refresh)
  store.setItem(STORAGE_KEYS.role, state.userRole || 'guest')
  store.setItem(STORAGE_KEYS.perms, JSON.stringify(state.permissions || []))
  store.setItem(STORAGE_KEYS.persist, state.persistMode)
  // notify other tabs quickly
  try { bc?.postMessage({ type: 'auth:update' }) } catch {}
}

const persistLoad = () => {
  // choose mode saved last time (fallback local->session)
  const rawMode = localStorage.getItem(STORAGE_KEYS.persist) || sessionStorage.getItem(STORAGE_KEYS.persist)
  if (rawMode === 'session' || rawMode === 'local') state.persistMode = rawMode
  const store = getStorage()
  if (!store) return
  const a = store.getItem(STORAGE_KEYS.access)
  const r = store.getItem(STORAGE_KEYS.refresh)
  const role = store.getItem(STORAGE_KEYS.role)
  const perms = store.getItem(STORAGE_KEYS.perms)

  if (a) state.accessToken = a
  if (r) state.refreshToken = r
  if (role) state.userRole = role
  if (perms) { try { state.permissions = JSON.parse(perms) || [] } catch { state.permissions = [] } }

  // derive claims
  if (state.accessToken) {
    const claims = decodeJwt(state.accessToken) || {}
    state.exp = claims.exp ?? null
    state.iat = claims.iat ?? null
    // optional claims-driven roles/perms
    if (!role && claims.role) state.userRole = claims.role
    if (!perms && claims.permissions) state.permissions = Array.isArray(claims.permissions) ? claims.permissions : []
  }
}

const clearPersist = () => {
  const storages = [localStorage, sessionStorage]
  for (const s of storages) {
    s.removeItem(STORAGE_KEYS.access)
    s.removeItem(STORAGE_KEYS.refresh)
    s.removeItem(STORAGE_KEYS.role)
    s.removeItem(STORAGE_KEYS.perms)
  }
}

/* -------------- computed -------------- */
const isLoggedIn = computed(() => !!state.accessToken && !isExpired())
const secondsToExpiry = computed(() => {
  if (!state.exp) return null
  return Math.max(0, state.exp - nowSec())
})

function isExpired(skewSec = 20) {
  // treat as expired if no exp (opaque token) and server says 401
  if (!state.accessToken) return true
  if (!state.exp) return false
  return nowSec() >= (state.exp - skewSec)
}

/* -------------- core API -------------- */
function setPersistMode(mode = 'memory') {
  state.persistMode = (mode === 'session' || mode === 'local') ? mode : 'memory'
  persistWrite() // record new mode
}

function setTokens({ accessToken, refreshToken, persist = state.persistMode } = {}) {
  if (persist && persist !== state.persistMode) setPersistMode(persist)
  state.accessToken = accessToken || null
  state.refreshToken = refreshToken ?? state.refreshToken ?? null

  const claims = accessToken ? decodeJwt(accessToken) : null
  state.exp = claims?.exp ?? null
  state.iat = claims?.iat ?? null
  // auto adopt role/perms from claims if present
  if (claims?.role) state.userRole = claims.role
  if (Array.isArray(claims?.permissions)) state.permissions = claims.permissions

  state.lastRefreshedAt = Date.now()
  persistWrite()
  scheduleAutoRefresh()
}

function setRole(role = 'guest') {
  state.userRole = role || 'guest'
  persistWrite()
}
function setPermissions(perms = []) {
  state.permissions = Array.isArray(perms) ? perms : []
  persistWrite()
}

async function logout() {
  try { await revokeHandler?.() } catch {}
  clear()
}

function clear() {
  state.accessToken = null
  state.refreshToken = null
  state.exp = null
  state.iat = null
  state.userRole = 'guest'
  state.permissions = []
  state.lastRefreshedAt = Date.now()
  clearPersist()
  cancelAutoRefresh()
  try { bc?.postMessage({ type: 'auth:logout' }) } catch {}
}

/* -------------- refresh logic -------------- */
let refreshInFlight = null

function setRefreshHandler(fn /* async () => ({ accessToken, refreshToken? }) */) {
  refreshHandler = fn
  scheduleAutoRefresh()
}

function setRevokeHandler(fn /* async () => void */) {
  revokeHandler = fn
}

function cancelAutoRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleAutoRefresh() {
  cancelAutoRefresh()
  if (!refreshHandler || !state.accessToken || !state.exp) return
  const leadSec = 60 // refresh 60s kabla ya ku-expire
  const secs = Math.max(5, (state.exp - nowSec()) - leadSec)
  refreshTimer = setTimeout(() => {
    void refreshNow().catch(() => {}) // swallow, guards will handle 401 later
  }, secs * 1000)
}

async function refreshNow() {
  if (!refreshHandler) throw new Error('No refresh handler set')
  if (refreshInFlight) return refreshInFlight
  state.refreshing = true
  refreshInFlight = (async () => {
    const res = await refreshHandler()
    if (!res || !res.accessToken) throw new Error('Invalid refresh response')
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    return res
  })()
    .finally(() => {
      state.refreshing = false
      refreshInFlight = null
    })
  return refreshInFlight
}

/* -------------- role/permission helpers -------------- */
const userRole = computed(() => state.userRole)
const hasRole = (...roles) => roles.flat().includes(state.userRole)
const can = (perm) => Array.isArray(state.permissions) && state.permissions.includes(perm)

/* -------------- router guards (optional) -------------- */
function makeRouterGuards(router) {
  router.beforeEach(async (to) => {
    const requiresAuth = to.meta?.requiresAuth
    const roles = to.meta?.roles
    if (requiresAuth && !isLoggedIn.value) {
      // try silent refresh if possible
      if (state.refreshToken && refreshHandler) {
        try { await refreshNow() } catch {}
      }
    }
    if (requiresAuth && !isLoggedIn.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (roles && Array.isArray(roles) && roles.length && !hasRole(roles)) {
      return { name: 'forbidden' }
    }
    return true
  })
}

/* -------------- axios wiring (optional) -------------- */
/**
 * Wire an axios instance to:
 *  - attach Authorization header
 *  - attempt refresh once on 401, then retry original request
 */
function wireAxios(api, { header = 'Authorization', scheme = 'Bearer ' } = {}) {
  api.interceptors.request.use((config) => {
    if (state.accessToken) {
      config.headers = config.headers || {}
      config.headers[header] = scheme + state.accessToken
    }
    return config
  })
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const { response, config } = err || {}
      if (response?.status === 401 && !config.__retried401 && state.refreshToken && refreshHandler) {
        try {
          await refreshNow()
          config.__retried401 = true
          return api(config)
        } catch {
          clear()
        }
      }
      throw err
    }
  )
}

/* -------------- cross-tab sync -------------- */
function initCrossTab() {
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('auth')
      bc.onmessage = (e) => {
        if (e?.data?.type === 'auth:update') persistLoad()
        if (e?.data?.type === 'auth:logout') clear()
      }
    }
  } catch {}
  window.addEventListener('storage', (e) => {
    if (!Object.values(STORAGE_KEYS).includes(e.key)) return
    persistLoad()
  })
}

/* -------------- visibility hint (refresh when returning) -------------- */
function initVisibilityRefresh() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // If token nearly expired, refresh eagerly
      const left = secondsToExpiry.value
      if (left !== null && left <= 90 && state.refreshToken && refreshHandler) {
        void refreshNow().catch(() => {})
      }
    }
  })
}

/* -------------- public API -------------- */
export function useAuthStore() {
  return {
    // state/computed
    isLoggedIn,
    userRole,
    permissions: computed(() => state.permissions),
    secondsToExpiry,

    // tokens & identity
    setTokens,
    setPersistMode,
    setRole,
    setPermissions,

    // refresh & revoke
    setRefreshHandler,
    setRevokeHandler,
    refreshNow,

    // lifecycle
    logout,
    clear,

    // authZ helpers
    hasRole,
    can,

    // integrations
    makeRouterGuards,
    wireAxios,

    // (re)hydrate from storage
    _persistLoad: persistLoad,
  }
}

/* -------------- bootstrap once in app entry -------------- */
persistLoad()
initCrossTab()
initVisibilityRefresh()
