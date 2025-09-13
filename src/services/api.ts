const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const HEALTH = import.meta.env.VITE_HEALTH_URL || (API.replace(/\/api$/, "") + "/healthz");

export function getToken() {
  return localStorage.getItem("sb.token");
}
export function setToken(t: string) {
  localStorage.setItem("sb.token", t);
}
export function clearToken() {
  localStorage.removeItem("sb.token");
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // kwa cookie-auth ungeongeza: credentials: "include"
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j?.detail || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  // /me inaweza kurudisha object au nothing; jaribu json salama
  const text = await res.text();
  return (text ? JSON.parse(text) : ({} as T));
}

// Endpoints
export async function pingHealth() {
  const res = await fetch(HEALTH);
  const text = await res.text();
  return text.trim();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ access_token: string; user: any }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setToken(data.access_token);
  return data;
}
export async function me() {
  return apiFetch("/auth/me");
}
export async function whoami() {
  return apiFetch("/auth/_whoami");
}
export async function logout() {
  clearToken();
  // ikiwa unatumia cookie-auth, unaweza pia: await apiFetch("/auth/logout", { method: "POST" });
}
