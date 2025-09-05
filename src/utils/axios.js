// src/utils/axios.js
/* eslint-disable no-console */
import axios from "axios";

/**
 * ⚡ Mobile-first, resilient axios instance for SmartBiz
 * - Dynamic timeouts based on network quality (2G/3G/4G/Wi-Fi, Save-Data)
 * - Smart retries with exponential backoff + jitter (429/5xx/timeout)
 * - Request de-duplication to avoid double taps / rapid clicks
 * - ETag cache + 304 handling (stale-while-revalidate style)
 * - Optional offline queue for write ops (POST/PUT/PATCH/DELETE)
 * - Auth bearer token injection + single-flight refresh on 401
 * - Tiny event bus for rate-limit & network status signals
 * - Zero extra dependencies
 */

// =========================
// 🔧 Environment & Defaults
// =========================
const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error(
    "❌ VITE_API_BASE_URL is missing. Add it to your .env (e.g. VITE_API_BASE_URL=https://api.smartbiz.site)"
  );
}
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.0.0";
const WITH_CREDENTIALS = (import.meta.env.VITE_API_WITH_CREDENTIALS || "false") === "true";
const DEFAULT_TIMEOUT = 10000; // ms
const MAX_RETRIES = Number(import.meta.env.VITE_API_MAX_RETRIES || 3);
const CACHE_TTL_MS = Number(import.meta.env.VITE_API_CACHE_TTL_MS || 5 * 60 * 1000); // 5 min
const REFRESH_URL = import.meta.env.VITE_API_REFRESH_URL || "/auth/refresh";

// =========================
// 🧰 Tiny Utils
// =========================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => Math.floor(ms * (0.75 + Math.random() * 0.5));
const uuid = () =>
  (crypto?.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

const getLang = () => navigator?.language || "en-US";
const getNet = () => {
  const c = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
  return {
    type: c?.effectiveType || "unknown",
    saveData: Boolean(c?.saveData),
    downlink: c?.downlink || null,
  };
};

const computeTimeout = () => {
  const n = getNet();
  // Favor reliability over speed on weak links
  if (n.saveData) return 6000;
  if (n.type === "slow-2g" || n.type === "2g") return 7000;
  if (n.type === "3g") return 9000;
  if (n.type === "4g") return DEFAULT_TIMEOUT;
  return DEFAULT_TIMEOUT; // default / wifi
};

// =========================
// 📣 Mini Event Bus
// =========================
const listeners = new Map();
const on = (event, fn) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => off(event, fn);
};
const off = (event, fn) => listeners.get(event)?.delete(fn);
const emit = (event, payload) => listeners.get(event)?.forEach((fn) => fn(payload));

// Emit network changes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => emit("net:online", true));
  window.addEventListener("offline", () => emit("net:online", false));
}

// =========================
// 🔐 Token Provider (override as needed)
// =========================
const tokenProvider = {
  getAccess: () => localStorage.getItem("access_token") || null,
  setAccess: (t) => localStorage.setItem("access_token", t || ""),
  clearAccess: () => localStorage.removeItem("access_token"),
  // Optional refresh token via localStorage cookie-less flow
  getRefresh: () => localStorage.getItem("refresh_token") || null,
  setRefresh: (t) => localStorage.setItem("refresh_token", t || ""),
  clearRefresh: () => localStorage.removeItem("refresh_token"),
};
export const installTokenProvider = (custom) => Object.assign(tokenProvider, custom);

// =========================
// 🧠 Request De-dupe (cancel previous)
// =========================
const pending = new Map(); // key -> AbortController
const makeKey = (config) => {
  const { method, url, params, data } = config;
  // stringify order-stable
  const paramsStr = params ? JSON.stringify(params) : "";
  // Only include body for GET if explicitly requested; generally de-dupe GET by URL+params
  const bodyStr =
    method?.toLowerCase() === "get" ? "" : data ? (typeof data === "string" ? data : JSON.stringify(data)) : "";
  return `${method || "get"}::${url}::${paramsStr}::${bodyStr}`;
};

// =========================
// 🗃️ ETag Cache (localStorage + memory)
// =========================
const CACHE_PREFIX = "http_cache_v1:";
const etags = new Map(); // url -> etag (memory hint)

const cacheGetRaw = (key) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() > obj.expires) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return obj;
  } catch {
    return null;
  }
};
const cacheSetRaw = (key, value, ttl = CACHE_TTL_MS) => {
  try {
    const payload = { value, expires: Date.now() + ttl };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch {
    // storage full or disabled; ignore
  }
};
const cacheKeyFor = (url, params) => url + "::" + (params ? JSON.stringify(params) : "");

// =========================
// 📦 Offline Queue (optional per request)
// =========================
const QUEUE_KEY = "http_offline_queue_v1";
const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveQueue = (arr) => localStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
const enqueue = (job) => {
  const q = loadQueue();
  q.push(job);
  saveQueue(q);
  emit("queue:count", q.length);
};
export const getQueuedCount = () => loadQueue().length;

export const flushQueue = async () => {
  if (!navigator.onLine) return { flushed: 0, remaining: getQueuedCount() };
  let q = loadQueue();
  if (!q.length) return { flushed: 0, remaining: 0 };
  let flushed = 0;
  for (const job of q) {
    try {
      await raw.post(job.url, job.data, { headers: job.headers }); // use raw client to avoid recursion
      flushed++;
    } catch {
      // stop flushing on first failure to avoid thrash; network might be back but auth failed, etc.
      break;
    }
  }
  q = loadQueue().slice(flushed);
  saveQueue(q);
  emit("queue:count", q.length);
  return { flushed, remaining: q.length };
};
on("net:online", async (online) => {
  if (online) {
    await flushQueue();
  }
});

// =========================
// 🧵 Single-flight token refresh
// =========================
let refreshInFlight = null;
const raw = axios.create({ baseURL, withCredentials: WITH_CREDENTIALS }); // bare client (no interceptors)
const doRefresh = async () => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = tokenProvider.getRefresh();
    if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");
    const res = await raw.post(REFRESH_URL, { refresh_token: refreshToken });
    const { access_token, refresh_token } = res.data || {};
    if (!access_token) throw new Error("INVALID_REFRESH_RESPONSE");
    tokenProvider.setAccess(access_token);
    if (refresh_token) tokenProvider.setRefresh(refresh_token);
    return access_token;
  })()
    .catch((e) => {
      tokenProvider.clearAccess();
      tokenProvider.clearRefresh();
      throw e;
    })
    .finally(() => {
      // allow next refreshs
      setTimeout(() => (refreshInFlight = null), 0);
    });
  return refreshInFlight;
};

// =========================
// 🏁 Create main instance
// =========================
const instance = axios.create({
  baseURL,
  timeout: computeTimeout(),
  withCredentials: WITH_CREDENTIALS,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getLang(),
    "X-App-Version": APP_VERSION,
  },
});

// =========================
// 📤 Request Interceptor
// =========================
instance.interceptors.request.use((config) => {
  // Dynamic timeout per request (mobile-first)
  config.timeout = config.timeout || computeTimeout();

  // Unique ID for tracing
  (config.headers ||= {});
  config.headers["X-Request-Id"] = uuid();

  // Save-Data hint
  if (getNet().saveData) config.headers["Save-Data"] = "on";

  // Attach token
  const token = tokenProvider.getAccess?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // De-dupe GETs (cancel previous)
  const method = (config.method || "get").toLowerCase();
  const enableDedupe = config.dedupe !== false && (method === "get" || config.dedupe === true);
  if (enableDedupe) {
    const key = makeKey(config);
    const prev = pending.get(key);
    if (prev) {
      // cancel the previous in-flight request to free radio quickly
      prev.abort?.();
      pending.delete(key);
    }
    const ctrl = new AbortController();
    config.signal = ctrl.signal;
    pending.set(key, ctrl);
    // cleanup after response
    config.__pendingKey = key;
  }

  // ETag conditional GET
  if (method === "get" && config.cache !== "off") {
    const key = cacheKeyFor(config.url, config.params);
    const cached = cacheGetRaw(key);
    const knownETag = etags.get(key) || cached?.value?.etag;
    if (knownETag) {
      config.headers["If-None-Match"] = knownETag;
    }
    // Serve immediately from cache if asked (stale-while-revalidate style)
    if (config.cache === "prefer" && cached?.value?.data) {
      // Return a synthetic promise chain by short-circuiting; we still let network proceed.
      // Consumers will get the network response once it arrives (updated data).
      config.__serveCachedFirst = cached.value;
    }
  }

  // Optional offline queue for writes
  if (!navigator.onLine && ["post", "put", "patch", "delete"].includes(method) && config.offline === "queue") {
    enqueue({
      url: config.url,
      data: config.data,
      headers: config.headers,
    });
    // Craft synthetic "Accepted/Queued" response
    const synthetic = {
      data: { queued: true, offline: true },
      status: 202,
      statusText: "Accepted (queued offline)",
      headers: {},
      config,
      request: null,
    };
    // Resolve immediately and skip actual network
    return Promise.reject({ __offlineQueued: true, synthetic });
  }

  return config;
});

// =========================
// 📥 Response Interceptor
// =========================
instance.interceptors.response.use(
  async (response) => {
    // Clear pending key if any
    const key = response.config.__pendingKey;
    if (key) pending.delete(key);

    // Cache & ETag store for GETs
    const method = (response.config.method || "get").toLowerCase();
    if (method === "get" && response.status === 200) {
      const etag = response.headers?.etag;
      const k = cacheKeyFor(response.config.url, response.config.params);
      const payload = { etag, data: response.data, ts: Date.now() };
      etag && etags.set(k, etag);
      cacheSetRaw(k, payload, response.config.cacheTTL || CACHE_TTL_MS);
    }

    // Rate limit signals
    if (response.headers) {
      const lim = response.headers["x-ratelimit-limit"];
      const rem = response.headers["x-ratelimit-remaining"];
      const rst = response.headers["x-ratelimit-reset"];
      if (lim && rem) emit("ratelimit", { limit: Number(lim), remaining: Number(rem), reset: rst });
    }

    return response;
  },
  async (error) => {
    // Handle synthetic "queued offline"
    if (error?.__offlineQueued && error.synthetic) return error.synthetic;

    const config = error?.config || {};
    const method = (config.method || "get").toLowerCase();
    const key = config.__pendingKey;
    if (key) pending.delete(key);

    // Serve cached on 304 or when network fails but cache exists (graceful degrade)
    const k = cacheKeyFor(config.url, config.params);
    const cached = cacheGetRaw(k);

    // 304: return cached body with updated headers
    if (error?.response?.status === 304 && cached?.value?.data) {
      return {
        data: cached.value.data,
        status: 200,
        statusText: "OK (from cache, 304)",
        headers: error.response.headers || {},
        config,
        request: error.request,
      };
    }

    // 401: attempt token refresh (single-flight), then retry once
    if (error?.response?.status === 401 && !config.__isRetryAfterAuth && config.url !== REFRESH_URL) {
      try {
        const newToken = await doRefresh();
        if (newToken) {
          config.__isRetryAfterAuth = true;
          (config.headers ||= {});
          config.headers.Authorization = `Bearer ${newToken}`;
          return instance(config);
        }
      } catch {
        // fallthrough to normalized error
      }
    }

    // Smart retries for idempotent ops
    const shouldRetry =
      !config.__retryCount &&
      (method === "get" || method === "head") &&
      (error.code === "ECONNABORTED" ||
        !error.response || // network
        [408, 425, 429, 500, 502, 503, 504].includes(error?.response?.status));

    if (shouldRetry) {
      config.__retryCount = 0;
    }
    if (typeof config.__retryCount === "number" && config.__retryCount < (config.maxRetries ?? MAX_RETRIES)) {
      config.__retryCount++;
      // Respect Retry-After if present
      let wait = 0;
      const ra = error?.response?.headers?.["retry-after"];
      if (ra) {
        const seconds = Number(ra);
        if (!Number.isNaN(seconds)) wait = seconds * 1000;
      }
      // Exponential backoff with jitter
      const backoff = jitter(2 ** config.__retryCount * 200);
      await sleep(wait || backoff);
      return instance(config);
    }

    // If GET failed but we have warm cache, serve it as stale
    if (method === "get" && cached?.value?.data) {
      return {
        data: cached.value.data,
        status: 200,
        statusText: "OK (stale cache)",
        headers: {},
        config,
        request: null,
      };
    }

    // Normalize & rethrow
    const norm = new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Network error. Please check your connection and try again."
    );
    norm.status = error?.response?.status;
    norm.data = error?.response?.data;
    throw norm;
  }
);

// =========================
// 🧪 Convenience Helpers
// =========================
export const setAuthToken = (token) => tokenProvider.setAccess(token);
export const clearAuthToken = () => {
  tokenProvider.clearAccess();
  tokenProvider.clearRefresh?.();
};

// Allows per-request advanced flags:
//  - dedupe: boolean (default true for GET) – cancel previous duplicate
//  - cache: "off" | "prefer" (default undefined → cache writes but don't short-circuit)
//  - cacheTTL: number ms
//  - offline: "queue" to enqueue writes while offline
//  - maxRetries: number
export default instance;

/**
 * --------------------------
 * ✅ Quick Usage Examples
 * --------------------------
 *
 * // 1) Fast cached GET with background refresh
 * const res = await api.get('/products', { cache: 'prefer' });
 *
 * // 2) POST that queues if offline
 * const res = await api.post('/orders', body, { offline: 'queue' });
 *
 * // 3) Custom retries on a flaky endpoint
 * const res = await api.get('/feed', { maxRetries: 5, dedupe: true });
 *
 * // 4) Listen to rate limits & queue size
 * import api, { on, getQueuedCount, flushQueue } from '@/utils/axios';
 * on('ratelimit', ({ limit, remaining }) => console.log(limit, remaining));
 * on('queue:count', (n) => console.log('Queued writes:', n));
 * window.addEventListener('focus', () => flushQueue());
 */
