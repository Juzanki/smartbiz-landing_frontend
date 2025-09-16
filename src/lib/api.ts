// src/lib/api.ts
import axios, { AxiosError } from "axios";

/** Resolve and normalize base URL (remove trailing slash) */
export const API_ROOT_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

/** Axios instance (cookies enabled) */
export const api = axios.create({
  baseURL: API_ROOT_URL,
  withCredentials: true,             // 👈 muhimu kwa cookies (Set-Cookie / session)
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** (Optional) soma CSRF token kama backend yako inahitaji */
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Request interceptor: ongeza CSRF, Bearer token (kama ipo) */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const csrf = readCookie("csrftoken") || readCookie("XSRF-TOKEN");
  if (csrf) (config.headers as any)["X-CSRFToken"] = csrf;

  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  return config;
});

/** Response interceptor: toa ujumbe rafiki */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const d = err.response?.data as any;
    const message =
      d?.detail ? (Array.isArray(d.detail) ? d.detail.map((x:any)=>x.msg||x).join(" • ") : d.detail)
                : d?.message || err.message || "Request failed";
    return Promise.reject({ ...err, message });
  }
);

/** Types & helpers */
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

export async function signup(payload: SignupPayload) {
  // Shim yako ya backend: /api/auth/signup -> internally /api/auth/register (hakuna redirect)
  return api.post("/api/auth/signup", payload);
}

export async function loginJson(identifier: string, password: string) {
  const payload = /\S+@\S+\.\S+/.test(identifier)
    ? { email: identifier, password }
    : { username: identifier, password };
  return api.post("/api/auth/login", payload);
}

export async function loginForm(identifier: string, password: string) {
  const params = new URLSearchParams();
  params.set("username", identifier);
  params.set("password", password);
  return api.post("/api/auth/login-form", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function verifySession() {
  const paths = ["/api/auth/session/verify", "/api/session/verify", "/api/auth/me", "/api/me"];
  for (const p of paths) {
    try { return (await api.get(p, { timeout: 6000 })).data; } catch {}
  }
  throw new Error("No session verify route responded.");
}
