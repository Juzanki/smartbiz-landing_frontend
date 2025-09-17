// src/lib/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

const stripEndSlashes = (s: string) => s.replace(/\/+$/, "");
const isForbiddenHost = (v: string) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(v);

// Soma VITE_API_BASE kwanza; tukikosa, jaribu VITE_API_BASE_URL; default: TUMIA PROXY (/api)
const rawBase =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "";

let API_ROOT_URL = "";   // axios baseURL; ikibaki "", tuta-call origin ya Netlify
let USING_PROXY  = true; // /api kupitia Netlify proxy

if (rawBase && rawBase.trim() !== "" && rawBase.trim() !== "/api") {
  const candidate = stripEndSlashes(String(rawBase).trim());
  const isHttps   = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(candidate);
  if (!isHttps || isForbiddenHost(candidate)) {
    throw new Error(`[API] Invalid VITE_API_BASE value: "${rawBase}". Use "/api" or a public HTTPS URL.`);
  }
  API_ROOT_URL = candidate; // mfano: https://smartbiz-backend-xxxx.onrender.com
  USING_PROXY  = false;
}

console.log("[API] baseURL at runtime =", USING_PROXY ? "/api (via Netlify proxy)" : API_ROOT_URL);

export const API_DEBUG =
  (import.meta.env.VITE_APP_DEBUG?.toString() === "1") ||
  /(?:^|[?&])debug=1(?:&|$)/.test(location.search);

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}
export function setStoredToken(token: string, remember = true) {
  (remember ? localStorage : sessionStorage).setItem("access_token", token);
}
export function clearStoredToken() {
  try { localStorage.removeItem("access_token"); } catch {}
  try { sessionStorage.removeItem("access_token"); } catch {}
}

export function friendlyError(err: AxiosError<any> | any): string {
  const r = (err as AxiosError)?.response;
  const d = (r?.data ?? {}) as any;
  if (!r && (err?.request || err?.message === "Network Error")) {
    return "Network/CORS error. Please check your connection and CORS settings.";
  }
  if (Array.isArray(d?.detail)) return d.detail.map((x: any) => x?.msg || x?.detail || String(x)).join(" • ");
  return d?.detail || d?.message || (r ? `Request failed (${r.status})` : (err?.message || "Request failed"));
}

export const api: AxiosInstance = axios.create({
  baseURL: API_ROOT_URL,          // ikibaki "", path zako /api/... zitagonga origin (Netlify) → proxy
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;
  const token = getStoredToken();
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  if (API_DEBUG) console.debug("[API] →", config.method?.toUpperCase(), (config.baseURL ?? "") + (config.url || ""));
  return config;
});

api.interceptors.response.use(
  (res) => { if (API_DEBUG) console.debug("[API] ←", res.status, res.config.url); return res; },
  (err: AxiosError<any>) => {
    if (API_DEBUG) console.debug("[API] ✖", err.config?.url, err.message);
    return Promise.reject(Object.assign(err, { message: friendlyError(err) }));
  }
);

// Helpers
export type SignupPayload = {
  full_name: string; username: string; email: string; password: string; phone_number: string;
  language?: string; business_name?: string; business_type?: string;
};
export type LoginJsonPayload =
  | { email: string; password: string }
  | { username: string; password: string };

export async function healthz() { return api.get("/api/healthz", { timeout: 6000 }).then(r => r.data); }
export async function signup(payload: SignupPayload) { return api.post("/api/auth/signup", payload).then(r => r.data); }
export async function loginJson(identifier: string, password: string) {
  const body: LoginJsonPayload = /\S+@\S+\.\S+/.test(identifier)
    ? { email: identifier, password }
    : { username: identifier, password };
  return api.post("/api/auth/login", body).then(r => r.data);
}
export async function loginForm(identifier: string, password: string) {
  const params = new URLSearchParams(); params.set("username", identifier); params.set("password", password);
  return api.post("/api/auth/login-form", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" }})
           .then(r => r.data);
}
export async function verifySession() {
  const candidates = ["/api/auth/session/verify", "/api/session/verify", "/api/auth/me", "/api/me"];
  for (const p of candidates) { try { return (await api.get(p, { timeout: 6000 })).data; } catch {} }
  throw new Error("No session verify route responded.");
}
export async function logout() { try { await api.post("/api/auth/logout").catch(() => {}); } catch {} clearStoredToken(); }
