import "server-only";

/**
 * Laravel API client — server-side only.
 *
 * The base URL and any bearer token stay on the server: browser code reaches
 * the API through Server Components, Server Actions and Route Handlers.
 */

const API_BASE = (process.env.LARAVEL_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

/**
 * Proves to Laravel that a request comes from this storefront, so it may trust
 * the visitor address we forward. Without it every customer shares the Next.js
 * server's IP — and one rate-limit bucket (§27).
 */
const STOREFRONT_API_KEY = process.env.STOREFRONT_API_KEY;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`[API ${status}] ${path}`);
    this.name = "ApiError";
  }

  /**
   * Laravel validation errors, keyed by field.
   */
  get validationErrors(): Record<string, string[]> {
    const body = this.body as { errors?: Record<string, string[]> } | null;
    return body?.errors ?? {};
  }

  get userMessage(): string {
    const body = this.body as { message?: string } | null;
    return body?.message ?? "Something went wrong. Please try again.";
  }
}

export type RequestOptions = Omit<RequestInit, "body" | "method"> & {
  /** Query string parameters; arrays become repeated `key[]` entries. */
  query?: QueryParams;
  /** Bearer token for authenticated calls. */
  token?: string;
  /** The visitor's IP, forwarded so Laravel throttles per customer. */
  clientIp?: string;
  /** JSON body, or a FormData instance for uploads. */
  body?: unknown;
};

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];
export type QueryParams = Record<string, QueryValue | Record<string, (string | number)[]>>;

/**
 * Build a query string that matches Laravel's expectations:
 * arrays as `key[]=a&key[]=b`, nested maps as `key[child][]=a`.
 */
export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();

  const append = (key: string, value: QueryValue) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(`${key}[]`, String(entry)));
      return;
    }
    search.append(key, String(value));
  };

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [childKey, childValue] of Object.entries(value)) {
        append(`${key}[${childKey}]`, childValue);
      }
      continue;
    }
    append(key, value as QueryValue);
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, token, clientIp, body, headers, ...init } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
    ...init,
    method,
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(STOREFRONT_API_KEY ? { "X-Storefront-Key": STOREFRONT_API_KEY } : {}),
      ...(STOREFRONT_API_KEY && clientIp ? { "X-Client-IP": clientIp } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, path, await response.json().catch(() => null));
  }

  if (response.status === 204) {
    return null as T;
  }

  // Media URLs stay absolute. They point at the API/CDN origin and are served
  // from there directly — see `lib/api/media.ts`.
  return (await response.json()) as T;
}

/**
 * An unparsed request to Laravel, for the admin proxy: it streams downloads
 * (CSV exports, quote attachments) and passes bodies through untouched.
 */
export function rawApiFetch(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    token: string;
    clientIp?: string;
    headers?: Record<string, string>;
  },
): Promise<Response> {
  const { token, clientIp, headers, ...rest } = init;

  return fetch(`${API_BASE}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(STOREFRONT_API_KEY ? { "X-Storefront-Key": STOREFRONT_API_KEY } : {}),
      ...(STOREFRONT_API_KEY && clientIp ? { "X-Client-IP": clientIp } : {}),
      ...headers,
    },
  });
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>("POST", path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>("PUT", path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>("PATCH", path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

/**
 * Cache tags used with `cacheTag` so a catalogue change in Laravel can be
 * revalidated from a webhook without a full rebuild.
 */
export const CacheTags = {
  catalog: "catalog",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  collections: "collections",
  filterOptions: "filter-options",
  taxonomies: "taxonomies",
  /** CMS pages, the journal and the portfolio. */
  content: "content",
} as const;
