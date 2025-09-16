// src/lib/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

/* ───────────────────────────── Env & Base URL ───────────────────────────── */

const rawBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://127.0.0.1:8000";

/** Ondoa slashes za mwisho, spaces, na normalize proto */
export const API_ROOT_URL = String(rawBase).trim().replace(/\/+$/, "");

/** Debug flag (wezesha ?debug=1 pia) */
export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  /(?:^|[?&])debug=1(?:&|$)/.test(location.search);

/** ✅ Uone moja kwa moja kama frontend inatumia base sahihi */
console.log("[API] baseURL at runtime =", API_ROOT_URL);

/* ───────────────────────────── Utilities ───────────────────────────── */

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}
export function setStoredToken(token: string, remember = true): void {
  const store = remember ? localStorage : sessionStorage;
  store.setItem("access_token", token);
}
export function clearStoredToken(): void {
  try { localStorage.removeItem("access_token"); } catch {}
  try { sessionStorage.removeItem("access_token"); } catch {}
}

/** Sadaka ya ujumbe rafiki (kutoka kwa AxiosError) */
export function friendlyError(err: AxiosError<any> | any): string {
  const r = (err as AxiosError)?.response;
  const d = (r?.data ?? {}) as any;

  // CORS/Network
  if (!r && (err?.request || err?.message === "Network Error")) {
    return "Network/CORS error. Please check your connection and CORS settings.";
  }

  if (Array.isArray(d?.detail)) {
    return d.detail.map((x: any) => x?.msg || x?.detail || String(x)).join(" • ");
  }
  return (
    d?.detail ||
    d?.message ||
    (r ? `Request failed (${r.status})` : (err?.message || "Request failed"))
  );
}

/* ───────────────────────────── Axios Instance ───────────────────────────── */

export const api: AxiosInstance = axios.create({
  baseURL: API_ROOT_URL,            // 👈 lazima iwe bila /api
  withCredentials: true,            // 👈 muhimu kwa cookies/sessions
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** Request interceptor: ongeza CSRF + Bearer token */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // CSRF (kama backend yako inaweka csrftoken/XSRF-TOKEN)
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;

  // Bearer token (kama ume-login kwa JWT)
  const token = getStoredToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;

  if (API_DEBUG) {
    // Log rahisi bila body
    // eslint-disable-next-line no-console
    console.debug(
      "[API] →",
      config.method?.toUpperCase(),
      config.baseURL + (config.url || ""),
      { withCreds: config.withCredentials }
    );
  }
  return config;
});

/** Response interceptor: normalise makosa */
api.interceptors.response.use(
  (res) => {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug("[API] ←", res.status, res.config.url);
    }
    return res;
  },
  (err: AxiosError<any>) => {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug("[API] ✖", err.config?.url, err.message);
    }
    // Rudisha error iliyo na message rafiki tayari
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

/* ───────────────────────────── API Helpers ───────────────────────────── */

/** Health check */
export async function healthz() {
  return api.get("/api/healthz", { timeout: 6000 }).then(r => r.data);
}

/** Signup (backend ina shim: /api/auth/signup → internal /api/auth/register) */
export async function signup(payload: SignupPayload) {
  return api.post("/api/auth/signup", payload).then(r => r.data);
}

/** Login JSON (email au username) */
export async function loginJson(identifier: string, password: string) {
  const body: LoginJsonPayload = /\S+@\S+\.\S+/.test(identifier)
    ? { email: identifier, password }
    : { username: identifier, password };
  return api.post("/api/auth/login", body).then(r => r.data);
}

/** Legacy login via form-encoded (fallback, kama ipo backend) */
export async function loginForm(identifier: string, password: string) {
  const params = new URLSearchParams();
  params.set("username", identifier);
  params.set("password", password);
  return api
    .post("/api/auth/login-form", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    .then(r => r.data);
}

/** Thibitisha session via cookie/JWT (hujaribu njia mbalimbali) */
export async function verifySession() {
  const candidates = ["/api/auth/session/verify", "/api/session/verify", "/api/auth/me", "/api/me"];
  for (const p of candidates) {
    try { return (await api.get(p, { timeout: 6000 })).data; } catch {}
  }
  throw new Error("No session verify route responded.");
}

/** Logout helpers (JWT au cookie-session, kutegemea backend yako) */
export async function logout() {
  try { await api.post("/api/auth/logout").catch(() => {}); } catch {}
  clearStoredToken();
}

/* ───────────────────────────── Raw fetch alt (optional) ─────────────────────────────
await fetch(`${API_ROOT_URL}/api/auth/login`, {
  method: "POST",
  credentials: "include",  // 👈 muhimu kwa cookies
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
──────────────────────────────────────────────────────────────────────── */
