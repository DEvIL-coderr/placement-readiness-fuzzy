const BASE = import.meta.env?.VITE_API_URL ?? '/api';
const KEY = 'prf_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } },
};

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  const t = tokenStore.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 401 && t) {
    tokenStore.clear();
    window.dispatchEvent(new Event('auth:logout'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error ?? res.statusText);
    err.details = data.details;
    throw err;
  }
  return raw ? res : res.json();
}
