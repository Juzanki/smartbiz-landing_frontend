// src/lib/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SmartBiz API helper – robust, production-ready.
 * - Base URL: VITE_API_BASE || VITE_BACKEND_BASE || "" (relative)
 * - Retries + timeout + abort
 * - Auto JSON/text/blob parse
 * - GET caching (TTL)
 * - Cookie-based auth (credentials: "include")
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const ENV = (import.meta as any).env || {};
const BASE: string =
  (ENV.VITE_API_BASE as string) ||
  (ENV.VITE_BACKEND_BASE as string) ||
  ""; // tumia relative path ukitumia Netlify _redirects

const DEFAULT_TIMEOUT = Number(ENV.VITE_API_TIMEOUT_MS ?? 15000); // 15s
const MAX_RETRIES = Number(ENV.VITE_API_MAX_RETRIES ?? 1); // retries after the first attempt
const GET_CACHE_TTL = Number(ENV.VITE_API_CACHE_TTL_MS ?? 0); // 0=off

/** Endpoint builder */
function joinURL(base: string, path: string): string {
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return b + p;
}

/** Querystring builder */
export function qs(params?: Record<string, any>): string {
  if (!params) return "";
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x) => u.append(k, String(x)));
    else u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** ApiError inayoleta data + status + requestId */
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

/** Cache ndogo ya GET */
type CacheEntry = { ts: number; data: any };
const getCache = new Map<string, CacheEntry>();

/** Retry backoff ms */
function backoff(attempt: number): number {
  // attempt: 0 (first), 1, 2...
  const base = 400 * Math.pow(2, attempt); // 400, 800, 1600...
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

/** Detects JSON response */
function isJson(res: Response): boolean {
  const ct = res.headers.get("content-type")?.toLowerCase() || "";
  return ct.includes("application/json") || ct.includes("+json");
}

/** Parses body safely */
async function parseBody(res: Response): Promise<any> {
  if (res.status === 204) return null;
  if (isJson(res)) {
    return await res.json().catch(() => ({}));
  }
  // try text fallback
  const t = await res.text().catch(() => "");
  return t;
}

/** Core request */
export async function request<T = any>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
    signal?: AbortSignal;
    // low-level control:
    raw?: boolean; // ukitaka Response as-is
    noCredentials?: boolean; // zima cookies kwa request hii
    cacheTtlMs?: number; // override GET cache TTL
  } = {}
): Promise<T> {
  const method = (opts.method || "GET").toUpperCase() as HttpMethod;
  const url = joinURL(BASE, path);

  // GET cache (only when GET & 2xx & JSON)
  const useCache = method === "GET" && (opts.cacheTtlMs ?? GET_CACHE_TTL) > 0;
  const cacheKey = useCache ? `${method}:${url}` : "";
  const ttl = opts.cacheTtlMs ?? GET_CACHE_TTL;

  if (useCache) {
    const hit = getCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < ttl) {
      return hit.data as T;
    }
  }

  let lastErr: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT);

    try {
      const headers: Record<string, string> = {
        ...(opts.headers || {}),
      };

      let body: BodyInit | undefined;
      // auto set JSON header if body is plain object
      if (opts.body !== undefined && opts.body !== null) {
        if (
          typeof opts.body === "object" &&
          !(opts.body instanceof FormData) &&
          !(opts.body instanceof Blob)
        ) {
          headers["Content-Type"] = headers["Content-Type"] || "application/json";
          body = JSON.stringify(opts.body);
        } else {
          body = opts.body as any; // FormData/Blob supported
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
        // cookie-based auth
        credentials: opts.noCredentials ? "same-origin" : "include",
        signal: opts.signal ? opts.signal : c.signal,
      });

      clearTimeout(timer);

      // x-request-id (kama middleware yako inaweka)
      const reqId = res.headers.get("x-request-id") || undefined;

      if (!res.ok) {
        const data = await parseBody(res);
        // 5xx/429 – jaribu retry
        if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, backoff(attempt)));
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

      if (useCache && res.ok) {
        getCache.set(cacheKey, { ts: Date.now(), data });
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;

      // Abort/Network error – retries allowed
      const isAbort = err?.name === "AbortError";
      const isNet = err?.message?.includes("NetworkError") || err?.message?.includes("Failed to fetch");
      if ((isAbort || isNet) && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, backoff(attempt)));
        continue;
      }
      break;
    }
  }

  // Toa error iliyoeleweka
  if (lastErr instanceof ApiError) throw lastErr;
  throw new ApiError(String(lastErr?.message || "Network error"), { status: 0, data: null });
}

/** Shortcuts */
export const getJSON = <T = any>(path: string, opts?: Parameters<typeof request>[1]) =>
  request<T>(path, { ...(opts || {}), method: "GET" });

export const postJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<Parameters<typeof request>[1], "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "POST", body });

export const putJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<Parameters<typeof request>[1], "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "PUT", body });

export const patchJSON = <T = any>(
  path: string,
  body?: any,
  opts?: Omit<Parameters<typeof request>[1], "body" | "method">
) => request<T>(path, { ...(opts || {}), method: "PATCH", body });

export const delJSON = <T = any>(path: string, opts?: Parameters<typeof request>[1]) =>
  request<T>(path, { ...(opts || {}), method: "DELETE" });

/** Form helpers (x-www-form-urlencoded) */
export function toFormUrlEncoded(obj: Record<string, any>): string {
  const u = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    u.set(k, String(v));
  });
  return u.toString();
}
export async function postForm<T = any>(path: string, form: Record<string, any>) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: toFormUrlEncoded(form),
  });
}

/** File uploads */
export async function upload<T = any>(
  path: string,
  files: Record<string, File | Blob>,
  fields?: Record<string, any>
) {
  const fd = new FormData();
  Object.entries(files).forEach(([k, f]) => fd.append(k, f));
  Object.entries(fields || {}).forEach(([k, v]) => fd.append(k, String(v)));
  return request<T>(path, { method: "POST", body: fd });
}

/* ------------------------------ AUTH APIS ------------------------------- */
/** Adjust these paths to match your backend routes if different */
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
  // Returns { access_token, token_type, user }
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

/* ---------------------------- UTILITIES -------------------------------- */
/** Health check helper */
export async function health() {
  return getJSON("/health", { noCredentials: true, timeoutMs: 8000 });
}

/** Ping with abort example */
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

/** Clear GET cache (e.g. after logout) */
export function clearGetCache() {
  getCache.clear();
    }
