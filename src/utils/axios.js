// src/utils/axios.js
/* eslint-disable no-console */
import axios from "axios";

/* ---------------- Env & defaults ---------------- */
const rawBase =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "").toString();
const baseURL = rawBase.replace(/\/+$/g, ""); // kata slashes za mwisho
if (!baseURL) {
  console.warn(
    "[axios] VITE_API_URL haijawekwa; nitatumia origin ya sasa (/). " +
      "Weka Settings → Environment → VITE_API_URL=https://smartbiz-backend-xxxx.onrender.com"
  );
}

const APP_VERSION       = import.meta.env.VITE_APP_VERSION || "0.0.0";
const WITH_CREDENTIALS  = (import.meta.env.VITE_API_WITH_CREDENTIALS || "false") === "true";
const DEFAULT_TIMEOUT   = Number(import.meta.env.VITE_API_TIMEOUT || 10000);
const MAX_RETRIES       = Number(import.meta.env.VITE_API_MAX_RETRIES || 3);
const CACHE_TTL_MS      = Number(import.meta.env.VITE_API_CACHE_TTL_MS || 5 * 60 * 1000);
const REFRESH_URL       = import.meta.env.VITE_API_REFRESH_URL || "/auth/refresh";

/* ---------------- Tiny utils ---------------- */
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => Math.floor(ms * (0.75 + Math.random() * 0.5));
const uuid   = () =>
  (globalThis.crypto?.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

const getLang = () => (typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US");
const getNet = () => {
  const c =
    typeof navigator !== "undefined" &&
    (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
  return {
    type: c?.effectiveType || "unknown",
    saveData: !!c?.saveData,
    downlink: c?.downlink || null,
  };
};
const computeTimeout = () => {
  const n = getNet();
  if (n.saveData) return 8000;
  if (n.type === "slow-2g" || n.type === "2g") return 15000;
  if (n.type === "3g") return 12000;
  return DEFAULT_TIMEOUT; // 4g/wifi/unknown
};

/* ---------------- Mini event bus ---------------- */
const _listeners = new Map();
export const on = (event, fn) => {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(fn);
  return () => off(event, fn);
};
export const off = (event, fn) => _listeners.get(event)?.delete(fn);
export const emit = (event, payload) => _listeners.get(event)?.forEach((fn) => fn(payload));

if (typeof window !== "undefined") {
  window.addEventListener("online",  () => emit("net:online", true));
  window.addEventListener("offline", () => emit("net:online", false));
}

/* ---------------- Token provider (override-able) ---------------- */
const tokenProvider = {
  getAccess: () => {
    try { return localStorage.getItem("access_token"); } catch { return null; }
  },
  setAccess: (t) => { try { localStorage.setItem("access_token", t || ""); } catch {} },
  clearAccess: () => { try { localStorage.removeItem("access_token"); } catch {} },

  getRefresh: () => {
    try { return localStorage.getItem("refresh_token"); } catch { return null; }
  },
  setRefresh: (t) => { try { localStorage.setItem("refresh_token", t || ""); } catch {} },
  clearRefresh: () => { try { localStorage.removeItem("refresh_token"); } catch {} },
};
export const installTokenProvider = (custom) => Object.assign(tokenProvider, custom);

/* ---------------- Request de-dupe ---------------- */
const pending = new Map(); // key -> AbortController
const makeKey = (config) => {
  const { method, url, params, data } = config;
  const paramsStr = params ? JSON.stringify(params) : "";
  const m = (method || "get").toLowerCase();
  const bodyStr =
    m === "get" || m === "head" ? "" : data ? (typeof data === "string" ? data : JSON.stringify(data)) : "";
  return `${m}::${url}::${paramsStr}::${bodyStr}`;
};

/* ---------------- ETag cache ---------------- */
const CACHE_PREFIX = "http_cache_v1:";
const etags = new Map(); // url+params -> etag
const cacheKeyFor = (url, params) => url + "::" + (params ? JSON.stringify(params) : "");

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
  } catch { return null; }
};
const cacheSetRaw = (key, value, ttl = CACHE_TTL_MS) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ value, expires: Date.now() + ttl }));
  } catch {}
};

/* ---------------- Offline queue (optional) ---------------- */
const QUEUE_KEY = "http_offline_queue_v1";
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } };
const saveQueue = (arr) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(arr)); } catch {} };
const enqueue = (job) => {
  const q = loadQueue(); q.push(job); saveQueue(q); emit("queue:count", q.length);
};
export const getQueuedCount = () => loadQueue().length;

const raw = axios.create({ baseURL: baseURL || "/", withCredentials: WITH_CREDENTIALS });
export const flushQueue = async () => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, remaining: getQueuedCount() };
  }
  let q = loadQueue();
  if (!q.length) return { flushed: 0, remaining: 0 };
  let flushed = 0;
  for (const job of q) {
    try {
      await raw.request({ url: job.url, method: job.method || "post", data: job.data, headers: job.headers });
      flushed++;
    } catch {
      break; // acha ku-scan kama kuna failure
    }
  }
  q = loadQueue().slice(flushed);
  saveQueue(q);
  emit("queue:count", q.length);
  return { flushed, remaining: q.length };
};
on("net:online", async (online) => { if (online) await flushQueue(); });

/* ---------------- Single-flight refresh ---------------- */
let refreshInFlight = null;
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
      tokenProvider.clearAccess(); tokenProvider.clearRefresh(); throw e;
    })
    .finally(() => { setTimeout(() => (refreshInFlight = null), 0); });
  return refreshInFlight;
};

/* ---------------- Main instance ---------------- */
const api = axios.create({
  baseURL: baseURL || "/", // usiangushe app kama env haijapatikana
  timeout: computeTimeout(),
  withCredentials: WITH_CREDENTIALS,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getLang(),
    "X-App-Version": APP_VERSION,
  },
});

/* ---------------- Request interceptor ---------------- */
api.interceptors.request.use((config) => {
  config.timeout = config.timeout || computeTimeout();

  (config.headers ||= {});
  config.headers["X-Request-Id"] = uuid();
  if (getNet().saveData) config.headers["Save-Data"] = "on";

  const token = tokenProvider.getAccess?.();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const m = (config.method || "get").toLowerCase();
  const enableDedupe = config.dedupe !== false && (m === "get" || m === "head" || config.dedupe === true);
  if (enableDedupe) {
    const key  = makeKey(config);
    const prev = pending.get(key);
    if (prev) { prev.abort?.(); pending.delete(key); }
    const ctrl = new AbortController();
    config.signal = ctrl.signal;
    pending.set(key, ctrl);
    config.__pendingKey = key;
  }

  // ETag conditional GET
  if (m === "get" && config.cache !== "off") {
    const key       = cacheKeyFor(config.url, config.params);
    const cached    = cacheGetRaw(key);
    const knownETag = etags.get(key) || cached?.value?.etag;
    if (knownETag) config.headers["If-None-Match"] = knownETag;
  }

  // Offline queue for writes
  if (typeof navigator !== "undefined" && !navigator.onLine &&
      ["post", "put", "patch", "delete"].includes(m) &&
      config.offline === "queue") {
    enqueue({
      url: config.url,
      method: m,
      data: config.data,
      headers: config.headers,
    });
    // toa synthetic response
    const synthetic = {
      data: { queued: true, offline: true },
      status: 202,
      statusText: "Accepted (queued offline)",
      headers: {},
      config,
      request: null,
    };
    return Promise.reject({ __offlineQueued: true, synthetic });
  }

  return config;
});

/* ---------------- Response interceptor ---------------- */
api.interceptors.response.use(
  (response) => {
    // safisha de-dupe
    const key = response.config.__pendingKey; if (key) pending.delete(key);

    // Cache ETag kwa GET 200
    const m = (response.config.method || "get").toLowerCase();
    if (m === "get" && response.status === 200) {
      const etag = response.headers?.etag; // axios headers → lower-case
      const k = cacheKeyFor(response.config.url, response.config.params);
      const payload = { etag, data: response.data, ts: Date.now() };
      if (etag) etags.set(k, etag);
      cacheSetRaw(k, payload, response.config.cacheTTL || CACHE_TTL_MS);
    }

    // Rate-limit signals
    const lim = response.headers?.["x-ratelimit-limit"];
    const rem = response.headers?.["x-ratelimit-remaining"];
    const rst = response.headers?.["x-ratelimit-reset"];
    if (lim && rem) emit("ratelimit", { limit: Number(lim), remaining: Number(rem), reset: rst });

    return response;
  },
  async (error) => {
    if (error?.__offlineQueued && error.synthetic) return error.synthetic;

    const config = error?.config || {};
    const m = (config.method || "get").toLowerCase();
    const key = config.__pendingKey; if (key) pending.delete(key);

    // 304 → tumia cache
    const k = cacheKeyFor(config.url, config.params);
    const cached = cacheGetRaw(k);
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

    // 401 → refresh once
    if (error?.response?.status === 401 && !config.__isRetryAfterAuth && config.url !== REFRESH_URL) {
      try {
        const newToken = await doRefresh();
        if (newToken) {
          config.__isRetryAfterAuth = true;
          (config.headers ||= {});
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      } catch {/* fallthrough */}
    }

    // Smart retry kwa idempotent ops
    const firstTime = typeof config.__retryCount !== "number";
    if (firstTime) config.__retryCount = 0;

    const transient =
      error.code === "ECONNABORTED" ||
      !error.response ||
      [408, 425, 429, 500, 502, 503, 504].includes(error?.response?.status);

    if ((m === "get" || m === "head") && transient && config.__retryCount < (config.maxRetries ?? MAX_RETRIES)) {
      config.__retryCount++;
      let wait = 0;
      const ra = error?.response?.headers?.["retry-after"];
      if (ra) {
        const num = Number(ra);
        if (!Number.isNaN(num)) wait = num * 1000;
        else {
          const t = Date.parse(ra);
          if (!Number.isNaN(t)) wait = Math.max(0, t - Date.now());
        }
      }
      const backoff = jitter(2 ** config.__retryCount * 200);
      await sleep(wait || backoff);
      return api(config);
    }

    // GET imefeli lakini tuna cache → tumia stale
    if (m === "get" && cached?.value?.data) {
      return {
        data: cached.value.data,
        status: 200,
        statusText: "OK (stale cache)",
        headers: {},
        config,
        request: null,
      };
    }

    const norm = new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Network error. Please check your connection and try again."
    );
    norm.status = error?.response?.status;
    norm.data   = error?.response?.data;
    throw norm;
  }
);

/* ---------------- Helpers & exports ---------------- */
export const setAuthToken   = (token) => tokenProvider.setAccess(token);
export const clearAuthToken = () => { tokenProvider.clearAccess(); tokenProvider.clearRefresh?.(); };
export default api;

/*  Usage:
    import api, { on, getQueuedCount, flushQueue } from "@/utils/axios";
    const res = await api.get("/health", { cache: "prefer" });
*/
