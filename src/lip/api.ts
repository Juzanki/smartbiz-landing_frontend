// src/lib/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SmartBiz API helper — production-ready & Vite/Netlify friendly.
 *
 * Sifa kuu:
 * - Base URL auto: VITE_API_BASE || VITE_BACKEND_BASE || "" (relative via Netlify _redirects)
 * - Retries + timeout + abort (exponential backoff + jitter)
 * - Auto-parse: JSON / text (na Blob kwa raw mode)
 * - GET cache (TTL) + clearGetCache()
 * - Cookie-based auth by default (credentials: "include")
 * - Utilities: qs(), postForm(), upload(), buildClient() (kwa multiple bases)
 * - Auth endpoints tayari: register, login, me, logout, verifyCode, resendCode
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

type EnvLike = {
  VITE_API_BASE?: string;
  VITE_BACKEND_BASE?: string;
  VITE_API_TIMEOUT_MS?: string | number;
  VITE_API_MAX_RETRIES?: string | number;
  VITE_API_CACHE_TTL_MS?: string | number;
};

const ENV: EnvLike = ((import.meta as any)?.env ?? {}) as EnvLike;

// ----------- Defaults / ENV -----------
export const BASE: string =
  (ENV.VITE_API_BASE && String(ENV.VITE_API_BASE)) ||
  (ENV.VITE_BACKEND_BASE && String(ENV.VITE_BACKEND_BASE)) ||
  ""; // tumia relative path (pendekezo) ukitumia Netlify proxy

const DEFAULT_TIMEOUT = clampNumber(ENV.VITE_API_TIMEOUT_MS, 15_000);
const MAX_RETRIES = Math.max(0, clampNumber(ENV.VITE_API_MAX_RETRIES, 1));
const GET_CACHE_TTL = Math.max(0, clampNumber(ENV.VITE_API_CACHE_TTL_MS, 0));

function clampNumber(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

// ----------- Utils -----------
function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}
function joinURL(base: string, path: string): string {
  const p = normalizePath(path);
  if (!base) return p;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${b}${p}`;
}

export function qs(params?: Record<string, any>): string {
  if (!params) return "";
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => u.append(k, String(x)));
    else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export class ApiError extends Error {
  status: number;
  data: any;
  requestId?: string;
  constructor(message: string, opts: { status?: number; data?: any; requestId?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.data = opts.data;
    this.requestId = opts.requestId;
  }
}

// ----------- GET cache -----------
type CacheEntry = { ts: number; data: any };
const getCache = new Map<string, CacheEntry>();
export function clearGetCache() {
  getCache.clear();
}

// ----------- Backoff -----------
function backoff(attempt: number): number {
  const base = 400 * Math.pow(2, attempt); // 0→400, 1→800, 2→1600...
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

// ----------- Content helpers -----------
function isJson(res: Response): boolean {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  return ct.includes("application/json") || ct.includes("+json");
}
async function parseBody(res: Response): Promise<any> {
  // HEAD au 204/empty
  if (res.status === 204 || res.status === 205) return null;
  const len = res.headers.get("content-length");
  if (len === "0") return null;

  if (isJson(res)) {
    return await res.json().catch(() => ({}));
  }

  // text fallback
  const text = await res.text().catch(() => "");
  return text;
}

// ----------- Core -----------
export type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  raw?: boolean;           // ukitaka Response as-is
  noCredentials?: boolean; // zima cookies kwa request hii
  cacheTtlMs?: number;     // override GET cache TTL
};

export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = (opts.method || "GET").toUpperCase() as HttpMethod;
  const url = joinURL(BASE, path);

  const useCache = method === "GET" && (opts.cacheTtlMs ?? GET_CACHE_TTL) > 0;
  const cacheKey = useCache ? `${method}:${url}` : "";
  const ttl = opts.cacheTtlMs ?? GET_CACHE_TTL;

  if (useCache) {
    const hit = getCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  }

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT);

    try {
      const headers: Record<string, string> = { ...(opts.headers || {}) };
      let body: BodyInit | undefined;

      if (opts.body !== undefined && opts.body !== null) {
        const isPlainObject =
          typeof opts.body === "object" &&
          !(opts.body instanceof FormData) &&
          !(opts.body instanceof Blob) &&
          !(opts.body instanceof ArrayBuffer);

        if (isPlainObject) {
          headers["Content-Type"] = headers["Content-Type"] || "application/json";
          body = JSON.stringify(opts.body);
        } else {
          body = opts.body as BodyInit; // FormData/Blob/ArrayBuffer ok
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
        credentials: opts.noCredentials ? "same-origin" : "include",
        signal: opts.signal || ctrl.signal,
      });

      clearTimeout(timeout);

      const reqId = res.headers.get("x-request-id") || undefined;

      if (!res.ok) {
        const data = await parseBody(res);
        // Retry only on 5xx and 429
        if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
          await sleep(backoff(attempt));
          continue;
        }
        const msg =
          (data && (data.detail || data.message || data.error)) ||
          res.statusText ||
          "Request failed";
        throw new ApiError(String(msg), { status: res.status, data, requestId: reqId });
      }

      if (opts.raw) return (res as unknown) as T;

      const data = await parseBody(res);
      if (useCache) getCache.set(cacheKey, { ts: Date.now(), data });
      return data as T;
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;

      // Retry on abort (timeout) or network-ish errors
      const isAbort = err?.name === "AbortError";
      const isNet = /NetworkError|Failed to fetch|ECONNRESET|ENETUNREACH/i.test(err?.message || "");
      if ((isAbort || isNet) && attempt < MAX_RETRIES) {
        await sleep(backoff(attempt));
        continue;
      }
      break;
    }
  }

  if (lastErr instanceof ApiError) throw lastErr;
  throw new ApiError(String((lastErr as any)?.message || "Network error"), { status: 0, data: null });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ----------- Shortcuts -----------
export const getJSON = <T = any>(path: string, opts?: RequestOptions) =>
  request<T>(path, { ...(opts || {}), method: "GET" });

export const postJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<RequestOptions, "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "POST", body });

export const putJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<RequestOptions, "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "PUT", body });

export const patchJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<RequestOptions, "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "PATCH", body });

export const delJSON = <T = any>(path: string, opts?: RequestOptions) =>
  request<T>(path, { ...(opts || {}), method: "DELETE" });

// ----------- Forms & Upload -----------
export function toFormUrlEncoded(obj: Record<string, any>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    u.set(k, String(v));
  }
  return u.toString();
}
export async function postForm<T = any>(path: string, form: Record<string, any>) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: toFormUrlEncoded(form),
  });
}
export async function upload<T = any>(
  path: string,
  files: Record<string, File | Blob>,
  fields?: Record<string, any>
) {
  const fd = new FormData();
  for (const [k, f] of Object.entries(files)) fd.append(k, f);
  for (const [k, v] of Object.entries(fields || {})) fd.append(k, String(v));
  return request<T>(path, { method: "POST", body: fd });
}

// ----------- Build a custom API client (optional) -----------
export function buildClient(customBase = BASE) {
  const base = (customBase || "").trim();
  const go = <T = any>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...(opts || {}) });

  return {
    base,
    request: go,
    getJSON: <T = any>(p: string, o?: RequestOptions) => request<T>(p, { ...(o || {}), method: "GET" }),
    postJSON: <T = any>(p: string, b?: any, o?: Omit<RequestOptions, "body" | "method">) =>
      request<T>(p, { ...(o || {}), method: "POST", body: b }),
    putJSON: <T = any>(p: string, b?: any, o?: Omit<RequestOptions, "body" | "method">) =>
      request<T>(p, { ...(o || {}), method: "PUT", body: b }),
    patchJSON: <T = any>(p: string, b?: any, o?: Omit<RequestOptions, "body" | "method">) =>
      request<T>(p, { ...(o || {}), method: "PATCH", body: b }),
    delJSON: <T = any>(p: string, o?: RequestOptions) =>
      request<T>(p, { ...(o || {}), method: "DELETE" }),
    postForm: <T = any>(p: string, form: Record<string, any>) => postForm<T>(p, form),
    upload: <T = any>(p: string, files: Record<string, File | Blob>, fields?: Record<string, any>) =>
      upload<T>(p, files, fields),
  };
}

// ----------- Auth endpoints (rekebisha kama routes zako zinatofautiana) -----------
const AUTH = {
  register: "/auth/register",
  login: "/auth/login",
  me: "/auth/me",
  logout: "/auth/logout",
  verifyCode: "/auth/verify",
  resendCode: "/auth/resend",
};

export type Me = { id: string; email: string; username?: string | null };

export async function register(payload: {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  language?: string;
  phone_number?: string;
  business_name?: string;
  business_type?: string;
}) {
  return postJSON<Me>(AUTH.register, payload);
}

export async function login(payload: { identifier: string; password: string }) {
  // Expected: { access_token, token_type, user }
  return postJSON<{ access_token: string; token_type: string; user: Me }>(AUTH.login, payload);
}

export async function me(opts?: { cacheTtlMs?: number }) {
  return getJSON<Me>(AUTH.me, { cacheTtlMs: opts?.cacheTtlMs ?? 5000 });
}

export async function logout(): Promise<{ ok: true } | any> {
  return postJSON(AUTH.logout, {});
}

export async function verifyCode(payload: { code: string }) {
  return postJSON(AUTH.verifyCode, payload);
}

export async function resendCode(payload: { destination?: string }) {
  return postJSON(AUTH.resendCode, payload);
}

// ----------- Misc helpers -----------
export async function health() {
  return getJSON("/health", { noCredentials: true, timeoutMs: 8000 });
}
export function ping(timeoutMs = 3000): Promise<"ok"> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(joinURL(BASE, "/ready"), {
    credentials: "include",
    signal: ctrl.signal,
  })
    .then(() => {
      clearTimeout(t);
      return "ok" as const;
    })
    .catch(() => {
      clearTimeout(t);
      throw new ApiError("Ping failed");
    });
}

// ----------- Default export -----------
const api = {
  BASE,
  request,
  getJSON,
  postJSON,
  putJSON,
  patchJSON,
  delJSON,
  postForm,
  upload,
  qs,
  clearGetCache,
  buildClient,
  // auth
  register,
  login,
  me,
  logout,
  verifyCode,
  resendCode,
  // misc
  health,
  ping,
};
export default api;
