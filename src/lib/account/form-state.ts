/**
 * The result a Server Action hands back to the account form that called it.
 */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Field errors, keyed like the API's validation errors. */
  errors?: Record<string, string[]>;
  /**
   * What the customer typed, echoed back on failure so the form does not
   * clear itself. Passwords are never echoed.
   */
  values?: Record<string, string>;
  /** Differs on every submission, so effects (toasts, closing a dialog) fire once per submit. */
  submittedAt?: number;
};

export const IDLE: FormState = { status: "idle" };

export function fieldError(state: FormState, field: string): string | undefined {
  return state.errors?.[field]?.[0];
}

/**
 * Only same-site paths may be a post-sign-in destination; anything else
 * (`//evil.example`, `https://…`, `/\evil`) falls back to the dashboard.
 */
export function safeRedirectPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;

  try {
    const url = new URL(value, "http://storefront.local");
    return url.origin === "http://storefront.local" ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The first value of a query parameter that may be repeated. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
