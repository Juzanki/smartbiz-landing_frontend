// src/api.ts
import axios from "axios";

const RAW = (import.meta.env.VITE_API_BASE ?? "").toString().trim();

// kata slashes za mwisho
const clean = (s: string) => s.replace(/\/+$/, "");

let API_BASE = clean(RAW);

// DEV default: kama hakuna env, tumia local
if (!import.meta.env.PROD) {
  if (!API_BASE) API_BASE = "http://127.0.0.1:8000/api";
} else {
  // PROD rules: ruhusu tu "/api" au https://...
  if (!API_BASE) API_BASE = "/api";

  const isOK =
    API_BASE === "/api" ||
    /^https:\/\/[a-z0-9.-]+(?:\/.*)?$/i.test(API_BASE); // https://... tu

  if (!isOK) {
    throw new Error(
      `[API] Invalid VITE_API_BASE in production: "${RAW}". Use "/api" (with Netlify proxy) or a full https URL.`
    );
  }
}

console.info("[API] baseURL at runtime =", API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
});

// (hiari) interceptor ya error ili uone kinachorudi
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const u = err?.config?.baseURL + (err?.config?.url ?? "");
    console.warn("[API] failed:", u, err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  }
);
