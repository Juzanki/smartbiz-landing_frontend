/* eslint-disable no-console */
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

/* ─────────────────────────────────────────────────────────────────────────────
   BASE URL (Hard-coded → Render)
   Ukiwahi kubadilisha domain ya backend, badilisha tu thamani ya BACKEND_BASE.
───────────────────────────────────────────────────────────────────────────── */
export const BACKEND_BASE   = "https://smartbiz-backend-p45m.onrender.com";
export const API_ROOT_URL   = BACKEND_BASE;   // kwa pages zinazotaka kuonyesha hint
export const USING_API_PROXY = false;         // tupo direct-to-backend (si proxy)

const stripEndSlashes = (s: string) => s.replace(/\/+$/, "");
const apiURL = (path = "") =>
  ((API_ROOT_URL ? stripEndSlashes(API_ROOT_URL) : "") + "/" + path.replace(/^\/+/, "")).replace(/\/{2,}/g, "/");

/** Debug flag (au weka ?debug=1 kwenye URL) */
export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  (typeof location !== "undefined" && /(?:^|[?&])debug=1(?:&|$)/.test(location.search));

/* ───────────────────────────── Utils ───────────────────────────── */
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
const DEFAULT_TIMEOUT   = 60000;   // 60s
const MAX_RETRIES       = 3;
const CIRCUIT_COOLDOWN  = 6000;

let circuitOpenTill = 0;
let lastFailureAt   = 0;

export const api: AxiosInstance = axios.create({
  baseURL: API_ROOT_URL,
  withCredentials: true,             // ruhusu cookie-session kama ipo
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

if (API_DEBUG) {
  console.info("[API] baseURL:", API_ROOT_URL, "| proxy:", USING_API_PROXY ? "YES" : "NO");
}

/* ─────────── Wake-up helper (Render cold start) ─────────── */
export async function wakeBackend(opts: { soft?: boolean } = {}) {
  const to = opts.soft ? 4000 : 8000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), to);
  try {
    await fetch(apiURL("/api/healthz"), { signal: controller.signal, credentials: "include" });
  } catch {/* ignore */}
  clearTimeout(t);
}

/* ─────────── Interceptors: headers, logging, retries, HTML guard ─────────── */
api.interceptors.request.use((config) => {
  const nowMs = now();
  if (nowMs < circuitOpenTill) {
    // tunaendelea lakini tuna-log (circuit ya muda tu)
    if (API_DEBUG) console.debug("[API] circuit cooling…");
  }

  config.headers = config.headers || {};
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;

  const token = getStoredToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;

  if (API_DEBUG) {
    const shown = (config.baseURL ?? "") + (config.url || "");
    console.debug("[API] →", (config.method || "GET").toUpperCase(), shown);
  }
  return config;
});

api.interceptors.response.use(
  (res: AxiosResponse) => {
    if (API_DEBUG) console.debug("[API] ←", res.status, res.config.url);
    const ct = String(res.headers?.["content-type"] || "");
    // Kinga: tusipokee HTML kutoka /api/* (inaashiria SPA fallback/redirect)
    if ((res.config.url || "").startsWith("/api/") && ct.includes("text/html")) {
      throw new AxiosError(
        "Received HTML instead of JSON from /api (labda SPA fallback).",
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
    const status   = error?.response?.status;
    const code     = error?.code;

    lastFailureAt = now();

    const isTimeout  = code === "ECONNABORTED";
    const isNetErr   = code === "ERR_NETWORK" && !status;
    const retryable  = [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
    const mayRetry   = (isTimeout || isNetErr || retryable) && (cfg.__retryCount ?? 0) < (cfg.maxRetries ?? MAX_RETRIES);

    if (mayRetry) {
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

/* ─────────────────────── Public helpers ─────────────────────── */
export function isColdStartLikely(): boolean {
  return now() - lastFailureAt < 15_000;
}

export async function preWarmIfNeeded() {
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
  // wengi wa backends hutegemea "username" hapa; badilisha kama server inataka "email"
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
