// src/lib/api.ts
/* eslint-disable no-console */
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

/* ───────────────────────────── Base URL (hard-coded Render) ─────────────────────────────
   Tunatumia URL ya backend yako moja kwa moja:
   https://smartbiz-backend-p45m.onrender.com
   Ukiwahi kuhamisha domain, badilisha thamani ya BACKEND_BASE tu.
----------------------------------------------------------------------------------------- */

export const BACKEND_BASE = "https://smartbiz-backend-p45m.onrender.com"; // <<— Render URL yako
const API_ROOT_URL = BACKEND_BASE;           // hakuna proxy
const USING_API_PROXY = false;               // kwa rekodi tu

const stripEndSlashes = (s: string) => s.replace(/\/+$/, "");
function apiURL(path: string): string {
  const left = API_ROOT_URL;
  const right = path || "";
  return ((left ? stripEndSlashes(left) : "") + "/" + right.replace(/^\/+/, "")).replace(/\/{2,}/g, "/");
}

/** Debug flag (au weka ?debug=1 kwenye URL) */
export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  (typeof location !== "undefined" && /(?:^|[?&])debug=1(?:&|$)/.test(location.search));

/* ───────────────────────────── Small utils ───────────────────────────── */

const now = () => Date.now();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (n: number) => Math.min(8000, 350 * 2 ** n) + Math.floor(Math.random() * 200);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getStoredToken(): string | null {
  try { return localStorage.getItem("access_token") || sessionStorage.getItem("access_token"); } catch { return null; }
}
export function setStoredToken(token: string, remember = true): void {
  try { (remember ? localStorage : sessionStorage).setItem("access_token", token); } catch {}
}
export function clearStoredToken(): void {
  try { localStorage.removeItem("access_token"); } catch {}
  try { sessionStorage.removeItem("access_token"); } catch {}
}

/** Ujumbe rafiki wa makosa */
export function friendlyError(err: AxiosError<any> | any): string {
  const r = (err as AxiosError)?.response;
  const d = (r?.data ?? {}) as any;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Hakuna mtandao. Tafadhali ungana kisha ujaribu tena.";
  }
  if (!r && (err?.request || err?.code === "ECONNABORTED" || err?.message?.includes("Network"))) {
    return "Seva inajiwasha au mtandao unasuasua. Jaribu tena baada ya sekunde chache.";
  }
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x: any) => x?.msg || x?.detail || String(x)).join(" • ");
  }
  return d?.detail || d?.message || (r ? `Ombi limeshindikana (${r.status})` : (err?.message || "Ombi limeshindikana"));
}

/* ───────────────────────────── Axios Instance ───────────────────────────── */

const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000); // 60s
const MAX_RETRIES      = Number(import.meta.env.VITE_API_MAX_RETRIES || 3);
const CIRCUIT_WINDOWMS = 20_000;
const CIRCUIT_COOLDOWN = 6_000;

// “circuit” ndogo dhidi ya maombi mengi yanayofeli mfululizo
let circuitOpenTill = 0;
let lastFailureAt = 0;

export const api: AxiosInstance = axios.create({
  baseURL: API_ROOT_URL,     // absolute base (Render)
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

if (API_DEBUG) {
  console.info("[API] baseURL:", USING_API_PROXY ? "(proxy) /api/*" : API_ROOT_URL);
}

/* ─────────── Wake-up helper: iamsha backend (Render cold start) ─────────── */

export async function wakeBackend(opts: { soft?: boolean } = {}) {
  const to = opts.soft ? 4000 : 8000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), to);
  try {
    // tumia health ya API (prefixed)
    const url = apiURL("/api/healthz");
    await fetch(url, { signal: controller.signal, credentials: "include" });
  } catch {/* ignore */}
  clearTimeout(t);
}

/* ─────────── Interceptors: headers, logging, retries, HTML guard ─────────── */

// Request: ongeza CSRF/JWT + log
api.interceptors.request.use((config) => {
  const nowMs = now();
  if (nowMs < circuitOpenTill) {
    const wait = circuitOpenTill - nowMs;
    config.timeout = Math.max(config.timeout || DEFAULT_TIMEOUT, DEFAULT_TIMEOUT);
    if (API_DEBUG) console.debug("[API] circuit cooling, proceeding in background ~", wait, "ms");
  }

  config.headers = config.headers || {};
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;
  const token = getStoredToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;

  if (API_DEBUG) {
    const urlShown = (config.baseURL ?? "") + (config.url || "");
    console.debug("[API] →", (config.method || "GET").toUpperCase(), urlShown, { withCreds: config.withCredentials });
  }
  return config;
});

// Response: SPA-fallback guard + smart retries + error normalize
api.interceptors.response.use(
  (res: AxiosResponse) => {
    if (API_DEBUG) console.debug("[API] ←", res.status, res.config.url);
    const ct = String(res.headers?.["content-type"] || "");
    if ((res.config.url || "").startsWith("/api/") && ct.includes("text/html")) {
      throw new AxiosError(
        "Received HTML instead of JSON from /api (huenda SPA fallback).",
        "ERR_BAD_RESPONSE",
        res.config,
        res.request,
        res
      );
    }
    return res;
  },
  async (error: AxiosError<any>) => {
    const cfg: any = error?.config || {};
    const status = error?.response?.status;
    const code = error?.code;

    lastFailureAt = now();

    const isTimeout = code === "ECONNABORTED";
    const isNetErr = code === "ERR_NETWORK" && !status;
    const retryableStatus = [408, 425, 429, 500, 502, 503, 504].includes(Number(status));

    const canRetry =
      (isTimeout || isNetErr || retryableStatus) &&
      (cfg.__retryCount ?? 0) < (cfg.maxRetries ?? MAX_RETRIES) &&
      (cfg.method || "get").toLowerCase() !== "get" ? true : (isTimeout || isNetErr || retryableStatus);

    if (canRetry) {
      cfg.__retryCount = (cfg.__retryCount ?? 0) + 1;
      if (cfg.__retryCount === 1) await wakeBackend();
      if (isNetErr) circuitOpenTill = now() + CIRCUIT_COOLDOWN;

      const wait = backoff(cfg.__retryCount);
      if (API_DEBUG) console.debug(`[API] retry #${cfg.__retryCount} in ~${wait}ms`, { status, code });
      await delay(wait);
      return api(cfg);
    }

    if (API_DEBUG) console.debug("[API] ✖", cfg?.url, code, status, error.message);
    error.message = friendlyError(error);
    return Promise.reject(error);
  }
);

/* ───────────────────────────── Types ───────────────────────────── */

export type SignupPayload = {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone_number: string;
  language?: string;
  business_name?: string;
  business_type?: string;
};

export type LoginJsonPayload =
  | { email: string; password: string }
  | { username: string; password: string };

/* ─────────────────────── Public small helpers ─────────────────────── */

export function isColdStartLikely(): boolean {
  return now() - lastFailureAt < 15_000;
}

export async function preWarmIfNeeded() {
  // bado render huweza kuwa cold-start; iamsha kimya kimya
  await wakeBackend({ soft: true }).catch(() => {});
}

/* ───────────────────────────── API calls ───────────────────────────── */

export async function healthz() {
  return api.get("/api/healthz", { timeout: 6000 }).then((r) => r.data);
}

export async function signup(payload: SignupPayload) {
  await preWarmIfNeeded();
  return api.post("/api/auth/signup", payload).then((r) => r.data);
}

export async function loginJson(identifier: string, password: string) {
  await preWarmIfNeeded();
  const body: LoginJsonPayload = /\S+@\S+\.\S+/.test(identifier)
    ? { email: identifier, password }
    : { username: identifier, password };
  return api.post("/api/auth/login", body).then((r) => r.data);
}

export async function loginForm(identifier: string, password: string) {
  await preWarmIfNeeded();
  const params = new URLSearchParams();
  params.set("username", identifier);
  params.set("password", password);
  return api
    .post("/api/auth/login-form", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    .then((r) => r.data);
}

export async function verifySession() {
  const candidates = ["/api/auth/session/verify", "/api/session/verify", "/api/auth/me", "/api/me"];
  for (const p of candidates) {
    try {
      return (await api.get(p, { timeout: 6000 })).data;
    } catch {/* try next */}
  }
  throw new Error("No session verify route responded.");
}

export async function logout() {
  try { await api.post("/api/auth/logout").catch(() => {}); } catch {}
  clearStoredToken();
}
