// src/stores/auth.js
/* eslint-disable no-console */
import { reactive, computed } from 'vue'

/**
 * SmartBiz Auth Store (Vue 3)
 * - token | cookie | hybrid auth modes
 * - remember: memory | session | local
 * - auto refresh (single-flight) + clock-skew handling
 * - cross-tab sync (storage + BroadcastChannel)
 * - axios + fetch helpers
 * - role/permission helpers + router guards
 *
 * USAGE (mfano haraka):
 *   import { useAuthStore } from '@/stores/auth'
 *   const auth = useAuthStore()
 *   auth.setAuthMode('cookie') // au 'token' (default) / 'hybrid'
 *   auth.setPersistMode('session')
 *   auth.setLoginHandler(async (creds)=> api.post('/auth/login', creds).then(r=>r.data))
 *   auth.setRefreshHandler(async ()=> api.post('/auth/token/refresh').then(r=>r.data))
 *   auth.setRevokeHandler(async ()=> api.post('/auth/logout'))
 *   auth.setMeHandler(async ()=> api.get('/auth/me').then(r=>r.data))
 */

const STORAGE_KEYS = {
  persist: 'auth:persist',           // memory | session | local
  access:  'auth:access',
  refresh: 'auth:refresh',
  role:    'auth:role',
  perms:   'auth:perms',
  mode:    'auth:mode',              // token | cookie | hybrid
  meta:    'auth:meta',              // {exp,iat,uid,email,...}
}

const state = reactive({
  // tokens (default memory)
  accessToken: null,
  refreshToken: null,

  // jwt claims
  exp: null,                // unix seconds
  iat: null,
  sub: null,
  meta: {},

  // authZ
  userRole: 'guest',
  permissions: [],

  // modes
  persistMode: 'memory',    // memory | session | local
  authMode: 'token',        // token | cookie | hybrid

  // lifecycle
  lastRefreshedAt: 0,
  refreshing: false,
})

/** Handlers (unganisho la endpoints zako) */
let loginHandler   = null   // async (credentials) => { accessToken?, refreshToken?, role?, perms?, user? }
let refreshHandler = null   // async () => { accessToken, refreshToken? }
let revokeHandler  = null   // async () => void
let meHandler      = null   // async () => { role?, perms?, user? }

let refreshTimer   = null
let refreshInFlight = null
let bc = null               // BroadcastChannel

/* ---------------- tiny utils ---------------- */
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
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

const getStorage = () => {
  if (state.persistMode === 'session') return sessionStorage
  if (state.persistMode === 'local') return localStorage
  return null // memory only
}

/* ---------------- persist ---------------- */
const persistWrite = () => {
  const store = getStorage()
  if (!store) return
  state.accessToken  ? store.setItem(STORAGE_KEYS.access, state.accessToken) : store.removeItem(STORAGE_KEYS.access)
  state.refreshToken ? store.setItem(STORAGE_KEYS.refresh, state.refreshToken) : store.removeItem(STORAGE_KEYS.refresh)
  store.setItem(STORAGE_KEYS.role, state.userRole || 'guest')
  store.setItem(STORAGE_KEYS.perms, JSON.stringify(state.permissions || []))
  store.setItem(STORAGE_KEYS.persist, state.persistMode)
  store.setItem(STORAGE_KEYS.mode, state.authMode)
  store.setItem(STORAGE_KEYS.meta, JSON.stringify({ exp: state.exp, iat: state.iat, sub: state.sub, ...state.meta }))
  try { bc?.postMessage({ type: 'auth:update' }) } catch {}
}

const persistLoad = () => {
  const rawMode = localStorage.getItem(STORAGE_KEYS.persist) || sessionStorage.getItem(STORAGE_KEYS.persist)
  if (rawMode === 'session' || rawMode === 'local') state.persistMode = rawMode
  const rawAuthMode = localStorage.getItem(STORAGE_KEYS.mode) || sessionStorage.getItem(STORAGE_KEYS.mode)
  if (rawAuthMode === 'cookie' || rawAuthMode === 'hybrid' || rawAuthMode === 'token') state.authMode = rawAuthMode

  const store = getStorage()
  if (!store) return
  const a = store.getItem(STORAGE_KEYS.access)
  const r = store.getItem(STORAGE_KEYS.refresh)
  const role = store.getItem(STORAGE_KEYS.role)
  const perms = store.getItem(STORAGE_KEYS.perms)
  const meta = store.getItem(STORAGE_KEYS.meta)

  if (a) state.accessToken = a
  if (r) state.refreshToken = r
  if (role) state.userRole = role
  if (perms) { try { state.permissions = JSON.parse(perms) || [] } catch { state.permissions = [] } }
  if (meta)  { try { state.meta = JSON.parse(meta) || {} } catch { state.meta = {} } }

  // derive claims
  if (state.accessToken) {
    const claims = decodeJwt(state.accessToken) || {}
    state.exp = claims.exp ?? state.meta?.exp ?? null
    state.iat = claims.iat ?? state.meta?.iat ?? null
    state.sub = claims.sub ?? state.meta?.sub ?? null
    if (!role && claims.role) state.userRole = claims.role
    if (!perms && claims.permissions) state.permissions = Array.isArray(claims.permissions) ? claims.permissions : []
  } else {
    state.exp = state.meta?.exp ?? null
    state.iat = state.meta?.iat ?? null
    state.sub = state.meta?.sub ?? null
  }
}

const clearPersist = () => {
  const storages = [localStorage, sessionStorage]
  for (const s of storages) {
    s.removeItem(STORAGE_KEYS.access)
    s.removeItem(STORAGE_KEYS.refresh)
    s.removeItem(STORAGE_KEYS.role)
    s.removeItem(STORAGE_KEYS.perms)
    s.removeItem(STORAGE_KEYS.mode)
    s.removeItem(STORAGE_KEYS.meta)
  }
}

/* ---------------- computed ---------------- */
const isLoggedIn = computed(() => {
  // cookie mode: tunaamini cookie session ikiwa server itasema OK kwenye /auth/me
  if (state.authMode === 'cookie') return !!(state.userRole && state.userRole !== 'guest')
  return !!state.accessToken && !isExpired()
})

const secondsToExpiry = computed(() => {
  if (!state.exp) return null
  return Math.max(0, state.exp - nowSec())
})

function isExpired(skewSec = 30) {
  if (state.authMode === 'cookie') return false
  if (!state.accessToken) return true
  if (!state.exp) return false
  return nowSec() >= (state.exp - skewSec)
}

/* ---------------- core setters ---------------- */
function setPersistMode(mode = 'memory') {
  state.persistMode = (mode === 'session' || mode === 'local') ? mode : 'memory'
  persistWrite()
}
function setAuthMode(mode = 'token') {
  state.authMode = (mode === 'cookie' || mode === 'hybrid') ? mode : 'token'
  persistWrite()
}

function setTokens({ accessToken, refreshToken, meta, persist = state.persistMode } = {}) {
  if (persist && persist !== state.persistMode) setPersistMode(persist)
  state.accessToken = accessToken || null
  state.refreshToken = refreshToken ?? state.refreshToken ?? null
  if (meta && typeof meta === 'object') state.meta = meta

  const claims = accessToken ? decodeJwt(accessToken) : null
  state.exp = claims?.exp ?? state.meta?.exp ?? null
  state.iat = claims?.iat ?? state.meta?.iat ?? null
  state.sub = claims?.sub ?? state.meta?.sub ?? null
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

/* ---------------- login / me / logout ---------------- */
function setLoginHandler(fn /* async (credentials) => {accessToken?,refreshToken?,role?,perms?,user?,meta?} */) { loginHandler = fn }
function setRefreshHandler(fn /* async () => { accessToken, refreshToken? } */) { refreshHandler = fn; scheduleAutoRefresh() }
function setRevokeHandler(fn /* async () => void */) { revokeHandler = fn }
function setMeHandler(fn /* async () => { role?, perms?, user?, meta? } */) { meHandler = fn }

async function login(credentials, { persist, mode } = {}) {
  if (mode) setAuthMode(mode)
  if (persist) setPersistMode(persist)
  if (!loginHandler) throw new Error('No login handler set')
  const res = await loginHandler(credentials)
  // cookie mode: tunaweza kupata role/perms kutoka /me badala ya token
  if (state.authMode === 'cookie' && meHandler) {
    try {
      const me = await meHandler()
      if (me?.role) state.userRole = me.role
      if (Array.isArray(me?.perms)) state.permissions = me.perms
      if (me?.meta) state.meta = { ...(state.meta || {}), ...(me.meta || {}) }
      persistWrite()
    } catch {}
  }
  setTokens(res || {})
  return true
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
  state.sub = null
  state.meta = {}
  state.userRole = 'guest'
  state.permissions = []
  state.lastRefreshedAt = Date.now()
  clearPersist()
  cancelAutoRefresh()
  try { bc?.postMessage({ type: 'auth:logout' }) } catch {}
}

/* ---------------- refresh logic ---------------- */
function cancelAutoRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

// lead time (sekunde kabla ya expiry) – utendaji: 30..120 kulingana na muda ulio baki
function _leadSeconds() {
  if (!state.exp) return 60
  const left = Math.max(0, state.exp - nowSec())
  return clamp(Math.floor(left * 0.1), 30, 120) // 10% ya muda uliobaki, min 30s max 120s
}

function scheduleAutoRefresh() {
  cancelAutoRefresh()
  if (!refreshHandler) return
  if (state.authMode === 'cookie') return // hakuna token ya ku-refresh
  if (!state.accessToken || !state.exp) return

  const secs = Math.max(5, (state.exp - nowSec()) - _leadSeconds())
  refreshTimer = setTimeout(() => {
    void refreshNow().catch(() => {}) // swallow; guards/zones zita-handle 401
  }, secs * 1000)
}

async function refreshNow() {
  if (state.authMode === 'cookie') return { ok: true } // nothing to do
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

/* ---------------- role/permission helpers ---------------- */
const userRole = computed(() => state.userRole)
const hasRole = (...roles) => roles.flat().includes(state.userRole)
const can = (perm) => Array.isArray(state.permissions) && state.permissions.includes(perm)

/* ---------------- router guards (optional) ---------------- */
function makeRouterGuards(router) {
  router.beforeEach(async (to) => {
    const requiresAuth = to.meta?.requiresAuth
    const roles = to.meta?.roles

    // Jaribu silent refresh ukikaribia ku-expire
    if (requiresAuth && state.authMode !== 'cookie' && state.accessToken && state.exp) {
      const left = state.exp - nowSec()
      if (left <= _leadSeconds() + 10 && refreshHandler) {
        try { await refreshNow() } catch {}
      }
    }

    if (requiresAuth && !isLoggedIn.value) {
      // cookie mode: jaribu /me kwanza
      if (state.authMode === 'cookie' && meHandler) {
        try {
          const me = await meHandler()
          if (me?.role) state.userRole = me.role
          if (Array.isArray(me?.perms)) state.permissions = me.perms
        } catch {}
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

/* ---------------- axios wiring (optional) ---------------- */
/**
 * - token/hybrid: huweka Authorization header
 * - 401 → refresh once → retry
 * - cookie mode: hakuna header; withCredentials inatosha kwa axios client yako
 */
function wireAxios(api, { header = 'Authorization', scheme = 'Bearer ' } = {}) {
  api.interceptors.request.use((config) => {
    config.headers = config.headers || {}
    // cookie mode: usiweke Authorization
    if (state.authMode !== 'cookie' && state.accessToken) {
      config.headers[header] = scheme + state.accessToken
    }
    return config
  })
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const { response, config } = err || {}
      if (response?.status === 401 && !config.__retried401 && refreshHandler && state.authMode !== 'cookie') {
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

/* ---------------- fetch helper (optional) ---------------- */
async function authFetch(input, init = {}) {
  const cfg = { ...init, headers: { ...(init.headers || {}) } }
  if (state.authMode !== 'cookie' && state.accessToken) {
    cfg.headers['Authorization'] = 'Bearer ' + state.accessToken
  }
  // Retry on 401 once
  const doFetch = async () => fetch(input, cfg)
  let res = await doFetch()
  if (res.status === 401 && refreshHandler && state.authMode !== 'cookie') {
    try {
      await refreshNow()
      cfg.headers['Authorization'] = 'Bearer ' + state.accessToken
      res = await doFetch()
    } catch {
      clear()
    }
  }
  return res
}

/* ---------------- cross-tab + visibility + network ---------------- */
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

function initVisibilityRefresh() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const left = secondsToExpiry.value
      if (state.authMode !== 'cookie' && left !== null && left <= clamp(_leadSeconds(), 20, 120) && refreshHandler) {
        void refreshNow().catch(() => {})
      }
      // cookie mode: jaribu /me kurekebisha role/perms baada ya muda
      if (state.authMode === 'cookie' && meHandler) {
        void meHandler().then(me => {
          if (me?.role) state.userRole = me.role
          if (Array.isArray(me?.perms)) state.permissions = me.perms
        }).catch(()=>{})
      }
    }
  })
}

function initNetworkRefresh() {
  window.addEventListener('online', () => {
    if (state.authMode !== 'cookie' && refreshHandler && isLoggedIn.value) {
      void refreshNow().catch(() => {})
    }
    if (state.authMode === 'cookie' && meHandler) {
      void meHandler().then(me => {
        if (me?.role) state.userRole = me.role
        if (Array.isArray(me?.perms)) state.permissions = me.perms
      }).catch(()=>{})
    }
  }, { passive: true })
}

/* ---------------- public API ---------------- */
export function useAuthStore() {
  return {
    // state/computed
    isLoggedIn,
    userRole,
    permissions: computed(() => state.permissions),
    secondsToExpiry,

    // config
    setPersistMode,
    setAuthMode,

    // tokens & identity
    setTokens,
    setRole,
    setPermissions,

    // handlers
    setLoginHandler,
    setRefreshHandler,
    setRevokeHandler,
    setMeHandler,

    // actions
    login,
    refreshNow,
    logout,
    clear,

    // authZ helpers
    hasRole,
    can,

    // integrations
    makeRouterGuards,
    wireAxios,
    fetch: authFetch,

    // (re)hydrate from storage
    _persistLoad: persistLoad,
  }
}

/* ---------------- bootstrap once ---------------- */
persistLoad()
initCrossTab()
initVisibilityRefresh()
initNetworkRefresh()
