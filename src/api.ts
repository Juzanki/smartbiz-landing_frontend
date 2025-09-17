// src/api.ts
const RAW = import.meta.env.VITE_API_BASE || '';
const baseURL = RAW.replace(/\/+$/, ''); // kata slash za mwisho

if (import.meta.env.PROD && /^https?:\/\//.test(baseURL) === false && baseURL !== '/api') {
  // Production inaruhusu tu URL kamili au "/api"
  throw new Error(`[API] Invalid VITE_API_BASE in production: "${RAW}"`);
}

export const API_BASE = baseURL; // tumia hii kila mahali
// mfano axios:
// export const api = axios.create({ baseURL: API_BASE, withCredentials: true });
