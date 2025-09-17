// src/lib/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

/* ─────────────────────── Base URL resolution (STRICT) ─────────────────────── */

const stripEndSlashes = (s: string) => s.replace(/\/+$/, "");
const isPrivateOrLocal = (v: string) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(
    v
  );

// Prefer VITE_API_BASE; fallback to VITE_API_BASE_URL if provided
const rawBase =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "";

/** If rawBase empty or "/api" → use Netlify proxy. Otherwise must be public HTTPS. */
let API_ROOT_URL = ""; // axios baseURL; empty means "use current origin"
let USING_PROXY = true;

if (rawBase && rawBase.trim() !== "" && rawBase.trim() !== "/api") {
  const candidate = stripEndSlashes(String(rawBase).trim());
  const isHttps = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(candidate);
  if (!isHttps || isPrivateOrLocal(candidate)) {
    throw new Error(
      `[API] Invalid VITE_API_BASE value: "${rawBase}". Use "/api" (Netlify proxy) ` +
        `or a full PUBLIC HTTPS URL (no localhost/private IP/http).`
    );
  }
  API_ROOT_URL = candidate;
  USING_PROXY = false;
}

console.log(
  "[API] baseURL at runtime =",
  USING_PROXY ? "/api (via Netlify proxy)" : API_ROOT_URL
);

/** Debug flag (also enabled by ?debug=1) */
export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  /(?:^|[?&])debug=1(?:&|$)/.test(location.search);

/* ───────────────────────────── Small helpers ───────────────────────────── */

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

/* ───────────────────────────── Axios instance ───────────────────────────── */

export const api: AxiosInstance = axios.create({
  // Using Netlify proxy? keep baseURL empty; our paths start with "/api/..."
  baseURL: API_ROOT_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Log + attach CSRF / JWT before each request
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;

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

// Normalize errors + guard against HTML (SPA fallback)
api.interceptors.response.use(
  (res: AxiosResponse) => {
    if (API_DEBUG) console.debug("[API] ←", res.status, res.config.url);

    // If server returned HTML for an /api request, surface a clear error.
    const ct = String(res.headers?.["content-type"] || "");
    if (res.config.url?.startsWith("/api/") && ct.includes("text/html")) {
      throw new Error(
        "Received HTML instead of JSON from /api. Most likely SPA fallback or wrong redirect " +
          "(ensure /api proxy redirect is ABOVE SPA fallback in netlify.toml)."
      );
    }
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

/* ───────────────────────────── API helpers (paths start with /api) ───────────────── */

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
