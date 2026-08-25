/**
 * Laravel API client — server-side only.
 *
 * Keeps the Laravel base URL and any service tokens out of the browser.
 * All functions here run exclusively in Next.js Server Components,
 * Route Handlers, or Server Actions.
 */

const API_BASE = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

export type ApiRequestInit = RequestInit & {
  /** Optional Bearer token (e.g. Sanctum token from session) */
  token?: string;
};

/**
 * Core fetch wrapper. Sets JSON headers, forwards auth token when provided,
 * and throws a descriptive error on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  { token, ...init }: ApiRequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // Next.js 15+ cache semantics — opt-in to caching per call site
    cache: init.cache ?? "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[API] ${res.status} ${res.statusText} — ${path}\n${body}`);
  }

  // 204 No Content — return null cast as T
  if (res.status === 204) return null as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export const apiGet = <T>(path: string, init?: ApiRequestInit) =>
  apiFetch<T>(path, { method: "GET", ...init });

export const apiPost = <T>(path: string, body: unknown, init?: ApiRequestInit) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), ...init });

export const apiPut = <T>(path: string, body: unknown, init?: ApiRequestInit) =>
  apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body), ...init });

export const apiDelete = <T>(path: string, init?: ApiRequestInit) =>
  apiFetch<T>(path, { method: "DELETE", ...init });
