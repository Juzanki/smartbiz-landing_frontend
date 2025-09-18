/* eslint-disable no-console */
// src/utils/axios.js
import axios from "axios"

/**
 * SmartBiz Axios – VITE_API_BASE first
 * - baseURL: from VITE_API_BASE (can be "/api" or full "https://…/api")
 * - Cookie auth (withCredentials) + optional Bearer
 * - Retries, ETag cache, de-dupe, offline queue
 * - Single-flight /auth/token/refresh
 */

/* ────────────────────────────────────────────────────────────
   Env & BaseURL
   ──────────────────────────────────────────────────────────── */
function normalizeBase(input) {
  const s = String(input || "").trim()
  if (!s) return "" // handle later with error
  // Absolute:
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/,"") // keep as-is (no trailing /)
  // Relative (same-origin):
  if (s.startsWith("/")) return s.replace(/\/+$/,"")       // e.g. "/api"
  // Fallback: treat as relative segment
  return "/" + s.replace(/^\/+|\/+$/g,"")
}

const RAW_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || ""
const API_BASE = normalizeBase(RAW_BASE)

if (!API_BASE) {
  throw new Error("❌ VITE_API_BASE haijawekwa. Mfano: VITE_API_BASE=/api")
}

const baseURL = API_BASE // tayari ime-normalize; usiongeze tena "/api"

const APP_VERSION      = import.meta.env.VITE_APP_VERSION || "0.0.0"
const WITH_CREDENTIALS = true     // cookie auth (Render)
const DEFAULT_TIMEOUT  = 10000
const MAX_RETRIES      = Number(import.meta.env.VITE_API_MAX_RETRIES || 3)
const CACHE_TTL_MS     = Number(import.meta.env.VITE_API_CACHE_TTL_MS || 5 * 60 * 1000)

// Refresh endpoint (relative to baseURL)
const REFRESH_URL = "/auth/token/refresh"

/* ────────────────────────────────────────────────────────────
   Utils
   ──────────────────────────────────────────────────────────── */
const sleep  = (ms) => new Promise(r => setTimeout(r, ms))
const jitter = (ms) => Math.floor(ms * (0.75 + Math.random() * 0.5))
const uuid   = () =>
  (crypto?.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    }))

const getLang = () => navigator?.language || "en-US"
const getNet  = () => {
  const c = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection
  return { type: c?.effectiveType || "unknown", saveData: !!c?.saveData }
}
const computeTimeout = () => {
  const n = getNet()
  if (n.saveData) return 6000
  if (n.type === "slow-2g" || n.type === "2g") return 7000
  if (n.type === "3g") return 9000
  return DEFAULT_TIMEOUT
}

/* ────────────────────────────────────────────────────────────
   Mini Event Bus
   ──────────────────────────────────────────────────────────── */
const listeners = new Map()
export const on  = (evt, fn) => { if (!listeners.has(evt)) listeners.set(evt, new Set()); listeners.get(evt).add(fn); return () => off(evt, fn) }
export const off = (evt, fn) => listeners.get(evt)?.delete(fn)
const emit       = (evt, p) => listeners.get(evt)?.forEach(fn => fn(p))
if (typeof window !== "undefined") {
  window.addEventListener("online",  () => emit("net:online", true))
  window.addEventListener("offline", () => emit("net:online", false))
}

/* ────────────────────────────────────────────────────────────
   Tokens
   ──────────────────────────────────────────────────────────── */
const tokenProvider = {
  getAccess:  () => localStorage.getItem("access_token") || null,
  setAccess:  (t) => localStorage.setItem("access_token", t || ""),
  clearAccess:() => localStorage.removeItem("access_token"),
  getRefresh: () => localStorage.getItem("refresh_token") || null,
  setRefresh: (t) => localStorage.setItem("refresh_token", t || ""),
  clearRefresh:() => localStorage.removeItem("refresh_token"),
}
export const installTokenProvider = (custom) => Object.assign(tokenProvider, custom)

/* ────────────────────────────────────────────────────────────
   De-dupe
   ──────────────────────────────────────────────────────────── */
const pending = new Map() // key -> AbortController
const makeKey = (cfg) => {
  const { method, url, params, data } = cfg
  const p   = params ? JSON.stringify(params) : ""
  const body= (method || "get").toLowerCase() === "get" ? "" : (typeof data === "string" ? data : JSON.stringify(data||""))
  return `${method || "get"}::${url}::${p}::${body}`
}

/* ────────────────────────────────────────────────────────────
   ETag cache (localStorage)
   ──────────────────────────────────────────────────────────── */
const CACHE_PREFIX = "http_cache_v1:"
const etags = new Map() // url+params -> etag
const cacheKeyFor  = (url, params) => url + "::" + (params ? JSON.stringify(params) : "")
const cacheGetRaw  = (key) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (Date.now() > obj.expires) { localStorage.removeItem(CACHE_PREFIX + key); return null }
    return obj
  } catch { return null }
}
const cacheSetRaw  = (key, value, ttl = CACHE_TTL_MS) => {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ value, expires: Date.now() + ttl })) } catch {}
}

/* ────────────────────────────────────────────────────────────
   Offline queue (optional)
   ──────────────────────────────────────────────────────────── */
const QUEUE_KEY = "http_offline_queue_v1"
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") } catch { return [] } }
const saveQueue = (arr) => localStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
const enqueue   = (job) => { const q = loadQueue(); q.push(job); saveQueue(q); emit("queue:count", q.length) }
export const getQueuedCount = () => loadQueue().length
export const flushQueue = async () => {
  if (!navigator.onLine) return { flushed: 0, remaining: getQueuedCount() }
  let q = loadQueue(); if (!q.length) return { flushed: 0, remaining: 0 }
  let flushed = 0
  for (const job of q) {
    try { await raw.post(job.url, job.data, { headers: job.headers }); flushed++ }
    catch { break }
  }
  q = loadQueue().slice(flushed); saveQueue(q); emit("queue:count", q.length)
  return { flushed, remaining: q.length }
}
on("net:online", async (online) => { if (online) await flushQueue() })

/* ────────────────────────────────────────────────────────────
   Single-flight refresh
   ──────────────────────────────────────────────────────────── */
let refreshInFlight = null
const raw = axios.create({ baseURL, withCredentials: WITH_CREDENTIALS })

const doRefresh = async () => {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const bearer = tokenProvider.getAccess?.()
    const headers = bearer ? { Authorization: `Bearer ${bearer}` } : undefined
    const res = await raw.post(REFRESH_URL, undefined, { headers })
    const { access_token } = res.data || {}
    if (!access_token) throw new Error("INVALID_REFRESH_RESPONSE")
    tokenProvider.setAccess?.(access_token)
    return access_token
  })()
  .catch((e) => { tokenProvider.clearAccess?.(); tokenProvider.clearRefresh?.(); throw e })
  .finally(() => setTimeout(() => (refreshInFlight = null), 0))
  return refreshInFlight
}

/* ────────────────────────────────────────────────────────────
   Main instance
   ──────────────────────────────────────────────────────────── */
const instance = axios.create({
  baseURL,
  timeout: computeTimeout(),
  withCredentials: WITH_CREDENTIALS,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getLang(),
    "X-App-Version": APP_VERSION,
  },
})

/* ────────────────────────────────────────────────────────────
   Request interceptor
   ──────────────────────────────────────────────────────────── */
instance.interceptors.request.use((config) => {
  config.timeout = config.timeout || computeTimeout()
  ;(config.headers ||= {})
  config.headers["X-Request-Id"] = uuid()
  if (getNet().saveData) config.headers["Save-Data"] = "on"

  // Optional Bearer – cookie auth tayari ipo kwa withCredentials
  const token = tokenProvider.getAccess?.()
  if (token) config.headers.Authorization = `Bearer ${token}`

  // De-dupe
  const method = (config.method || "get").toLowerCase()
  const enableDedupe = config.dedupe !== false && (method === "get" || config.dedupe === true)
  if (enableDedupe) {
    const key = makeKey(config)
    const prev = pending.get(key)
    if (prev) { prev.abort?.(); pending.delete(key) }
    const ctrl = new AbortController()
    config.signal = ctrl.signal
    pending.set(key, ctrl)
    config.__pendingKey = key
  }

  // ETag GET
  if (method === "get" && config.cache !== "off") {
    const key = cacheKeyFor(config.url, config.params)
    const cached = cacheGetRaw(key)
    const knownETag = etags.get(key) || cached?.value?.etag
    if (knownETag) config.headers["If-None-Match"] = knownETag
    if (config.cache === "prefer" && cached?.value?.data) config.__serveCachedFirst = cached.value
  }

  // Offline queue for writes
  if (!navigator.onLine && ["post","put","patch","delete"].includes(method) && config.offline === "queue") {
    enqueue({ url: config.url, data: config.data, headers: config.headers })
    const synthetic = { data:{ queued:true, offline:true }, status:202, statusText:"Accepted (queued offline)", headers:{}, config, request:null }
    return Promise.reject({ __offlineQueued: true, synthetic })
  }
  return config
})

/* ────────────────────────────────────────────────────────────
   Response interceptor
   ──────────────────────────────────────────────────────────── */
instance.interceptors.response.use(
  async (response) => {
    const key = response.config.__pendingKey; if (key) pending.delete(key)

    // Cache ETag
    const method = (response.config.method || "get").toLowerCase()
    if (method === "get" && response.status === 200) {
      const etag = response.headers?.etag
      const k = cacheKeyFor(response.config.url, response.config.params)
      const payload = { etag, data: response.data, ts: Date.now() }
      if (etag) etags.set(k, etag)
      cacheSetRaw(k, payload, response.config.cacheTTL || CACHE_TTL_MS)
    }

    // Signals (optional)
    const lim = response.headers?.["x-ratelimit-limit"]
    const rem = response.headers?.["x-ratelimit-remaining"]
    if (lim && rem) emit("ratelimit", { limit: Number(lim), remaining: Number(rem) })

    return response
  },
  async (error) => {
    if (error?.__offlineQueued && error.synthetic) return error.synthetic

    const config = error?.config || {}
    const method = (config.method || "get").toLowerCase()
    const key = config.__pendingKey; if (key) pending.delete(key)

    // 304 → serve cache
    const k = cacheKeyFor(config.url, config.params)
    const cached = cacheGetRaw(k)
    if (error?.response?.status === 304 && cached?.value?.data) {
      return { data: cached.value.data, status:200, statusText:"OK (from cache, 304)", headers:error.response.headers||{}, config, request:error.request }
    }

    // 401 → refresh once then retry
    if (error?.response?.status === 401 && !config.__isRetryAfterAuth && config.url !== REFRESH_URL) {
      try {
        const newToken = await doRefresh()
        if (newToken) {
          config.__isRetryAfterAuth = true
          ;(config.headers ||= {})
          config.headers.Authorization = `Bearer ${newToken}`
          return instance(config)
        }
      } catch { /* fallthrough */ }
    }

    // Smart retries for GET/HEAD (timeouts/5xx/429)
    if (typeof config.__retryCount !== "number") config.__retryCount = 0
    const retryable =
      (method === "get" || method === "head") &&
      (error.code === "ECONNABORTED" ||
        !error.response ||
        [408,425,429,500,502,503,504].includes(error?.response?.status))
    if (retryable && config.__retryCount < (config.maxRetries ?? MAX_RETRIES)) {
      config.__retryCount++
      let wait = 0
      const ra = error?.response?.headers?.["retry-after"]
      const seconds = Number(ra); if (!Number.isNaN(seconds)) wait = seconds * 1000
      await sleep(wait || jitter(2 ** config.__retryCount * 200))
      return instance(config)
    }

    // Stale cache fallback
    if (method === "get" && cached?.value?.data) {
      return { data: cached.value.data, status:200, statusText:"OK (stale cache)", headers:{}, config, request:null }
    }

    const norm = new Error(error?.response?.data?.message || error?.message || "Network error. Tafadhali jaribu tena.")
    norm.status = error?.response?.status
    norm.data   = error?.response?.data
    throw norm
  }
)

/* ────────────────────────────────────────────────────────────
   Exports
   ──────────────────────────────────────────────────────────── */
export const setAuthToken   = (t) => tokenProvider.setAccess?.(t)
export const clearAuthToken = () => { tokenProvider.clearAccess?.(); tokenProvider.clearRefresh?.() }

// Kuu yenye ulinzi wote
export const api = instance

// Aliasi rahisi (ikiwa unataka client mwepesi bila interceptors zote)
const simpleApi = axios.create({ baseURL, withCredentials: WITH_CREDENTIALS })
export default simpleApi

// Helper: ping (hiari)
export async function pingHealth() {
  try { const r = await simpleApi.get("/health", { timeout: 5000 }); return r.data || { ok:true } }
  catch (e) { return { ok:false, error: e?.message || String(e) } }
}
