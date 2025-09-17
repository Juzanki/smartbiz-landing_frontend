// src/lib/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

/* ───────────────────────────── Env & Base URL (strict) ───────────────────────────── */

const stripEndSlashes = (s: string) => s.replace(/\/+$/, "");
const isForbiddenHost = (v: string) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(
    v
  );

// Chukua VITE_API_BASE kwanza; kisha jaribu VITE_API_BASE_URL
const rawBase =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "";

// DEFAULT: tumia proxy ya Netlify (/api) bila fallback ya localhost
let API_ROOT_URL = "";   // axios baseURL; "" => tumia origin ya site (Netlify)
let USING_PROXY  = true; // /api kupitia Netlify proxy

if (rawBase && rawBase.trim() !== "" && rawBase.trim() !== "/api") {
  const candidate = stripEndSlashes(String(rawBase).trim());

  // Ruhusu tu HTTPS public domain (si http, si localhost/private IP)
  const isHttps = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(candidate);
  if (!isHttps || isForbiddenHost(candidate)) {
    throw new Error(
      `[API] Invalid VITE_API_BASE value: "${rawBase}". ` +
      `Use "/api" (with Netlify proxy) or a full public HTTPS URL.`
    );
  }

  API_ROOT_URL = candidate; // mfano: https://smartbiz-backend-xxxx.onrender.com
  USING_PROXY  = false;
}

/** ✅ Uone moja kwa moja kama frontend inatumia base sahihi */
console.log("[API] baseURL at runtime =", USING_PROXY ? "/api (via Netlify proxy)" : API_ROOT_URL);

/** Debug flag (wezesha ?debug=1 pia) */
export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  /(?:^|[?&])debug=1(?:&|$)/.test(location.search);

/* ───────────────────────────── Utilities ───────────────────────────── */

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}
export function setStoredToken(token: string, remember = true): void {
  (remember ? localStorage : sessionStorage).setItem("access_token", token);
}
export function clearStoredToken(): void {
  try { localStorage.removeItem("access_token"); } catch {}
  try { sessionStorage.removeItem("access_token"); } catch {}
}

/** Ujumbe rafiki (kutoka kwa AxiosError) */
export function friendlyError(err: AxiosError<any> | any): string {
  const r = (err as AxiosError)?.response;
  const d = (r?.data ?? {}) as any;

  if (!r && (err?.request || err?.message === "Network Error")) {
    return "Network/CORS error. Please check your connection and CORS settings.";
  }
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x: any) => x?.msg || x?.detail || String(x)).join(" • ");
  }
  return d?.detail || d?.message || (r ? `Request failed (${r.status})` : (err?.message || "Request failed"));
}

/* ───────────────────────────── Axios Instance ───────────────────────────── */

export const api: AxiosInstance = axios.create({
  // Ikiwa tunatumia Netlify proxy, baseURL ni "" (origin ya site).
  // Paths zetu bado zinaanza na "/api/..." kwa wito wote.
  baseURL: API_ROOT_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** Request interceptor: ongeza CSRF + Bearer token */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // CSRF (kama backend inaweka csrftoken/XSRF-TOKEN)
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;

  // Bearer token (JWT)
  const token = getStoredToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;

  if (API_DEBUG) {
    console.debug(
      "[API] →",
      config.method?.toUpperCase(),
      (config.baseURL ?? "") + (config.url || ""),
      { withCreds: config.withCredentials }
    );
  }
  return config;
});

/** Response interceptor: normalise makosa */
api.interceptors.response.use(
  (res) => {
    if (API_DEBUG) console.debug("[API] ←", res.status, res.config.url);
    return res;
  },
  (err: AxiosError<any>) => {
    if (API_DEBUG) console.debug("[API] ✖", err.config?.url, err.message);
    return Promise.reject(Object.assign(err, { message: friendlyError(err) }));
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

/* ───────────────────────────── API Helpers (paths huanza na /api) ───────────────── */

export async function healthz() {
  return api.get("/api/healthz", { timeout: 6000 }).then(r => r.data);
}

export async function signup(payload: SignupPayload) {
  return api.post("/api/auth/signup", payload).then(r => r.data);
}

export async function loginJson(identifier: string, password: string) {
  const body: LoginJsonPayload = /\S+@\S+\.\S+/.test(identifier)
    ? { email: identifier, password }
    : { username: identifier, password };
  return api.post("/api/auth/login", body).then(r => r.data);
}

export async function loginForm(identifier: string, password: string) {
  const params = new URLSearchParams();
  params.set("username", identifier);
  params.set("password", password);
  return api.post("/api/auth/login-form", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    .then(r => r.data);
}

export async function verifySession() {
  const candidates = ["/api/auth/session/verify", "/api/session/verify", "/api/auth/me", "/api/me"];
  for (const p of candidates) {
    try { return (await api.get(p, { timeout: 6000 })).data; } catch {}
  }
  throw new Error("No session verify route responded.");
}

export async function logout() {
  try { await api.post("/api/auth/logout").catch(() => {}); } catch {}
  clearStoredToken();
}
