// src/api.ts
import axios, { AxiosError } from "axios";

/** kata slashes za mwisho */
const trimEndSlashes = (s: string) => s.replace(/\/+$/, "");

/** guard: kataa localhost/private-IP/http */
const isBadHost = (v: string) =>
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(
    v
  );

const raw = String(import.meta.env.VITE_API_BASE ?? "").trim();
let API_BASE = trimEndSlashes(raw || "/api"); // default ni /api bila kujali env

// Ruhusu tu "/api" AU https://domain/...
const isHttpsUrl = /^https:\/\/[a-z0-9.-]+(?::\d+)?(\/.*)?$/i.test(API_BASE);
const isPathApi = API_BASE === "/api";

if (!(isPathApi || isHttpsUrl)) {
  throw new Error(
    `[API] VITE_API_BASE must be "/api" or an HTTPS URL. Got: "${raw}"`
  );
}
if (isHttpsUrl && (API_BASE.startsWith("http://") || isBadHost(API_BASE))) {
  throw new Error(
    `[API] Insecure/forbidden host in VITE_API_BASE: "${raw}". Use HTTPS public domain only.`
  );
}

console.info("[API] baseURL =", API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptors (logs fupi + kurudisha error halisi)
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const u = (err.config?.baseURL ?? "") + (err.config?.url ?? "");
    const code = err.response?.status;
    const kind =
      err.response?.headers?.["content-type"]?.includes("text/html")
        ? "HTML_RESPONSE"
        : "API_ERROR";
    console.warn("[API]", kind, code ?? "NO_STATUS", "→", u);
    return Promise.reject(err);
  }
);

// (hiari) helper ya endpoint joining bila // maradufu
export const join = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? trimEndSlashes(p) : p.replace(/^\/+/, "")))
    .join("/")
    .replace(/\/{2,}/g, "/");
