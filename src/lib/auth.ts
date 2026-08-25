/**
 * Laravel Sanctum — cookie-based SPA authentication helpers.
 *
 * Strategy:
 *  1. Client visits /api/auth/login  (Next.js Route Handler)
 *  2. Route Handler POSTs credentials to Laravel /sanctum/csrf-cookie + /login
 *  3. Laravel sets HttpOnly session cookie; Route Handler mirrors it to browser
 *  4. Subsequent requests from the browser include the cookie automatically
 *  5. Server Components read session via getSession() which calls /api/user
 *     on the Laravel side using the forwarded cookie
 *
 * This keeps all Laravel tokens server-side and out of JavaScript.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
  remember?: boolean;
};

// ---------------------------------------------------------------------------
// Server-side helpers (Server Components / Route Handlers / Actions)
// ---------------------------------------------------------------------------

/**
 * Forward the browser's session cookie to Laravel and return the
 * authenticated user, or null if not authenticated.
 *
 * Cache: "no-store" because auth state must be fresh on every request.
 */
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("laravel_session");
  const xsrfCookie = cookieStore.get("XSRF-TOKEN");

  if (!sessionCookie) return null;

  try {
    const res = await fetch(`${API_BASE}/api/user`, {
      headers: {
        Accept: "application/json",
        Cookie: `laravel_session=${sessionCookie.value}${xsrfCookie ? `; XSRF-TOKEN=${xsrfCookie.value}` : ""}`,
        ...(xsrfCookie ? { "X-XSRF-TOKEN": decodeURIComponent(xsrfCookie.value) } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Assert the user is authenticated. Redirects to /login if not.
 * Use in protected Server Components or Route Handlers.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * First obtain a CSRF cookie from Laravel, then attempt login.
 * Returns the Set-Cookie headers from Laravel so the Route Handler
 * can mirror them back to the browser.
 *
 * Call this from a Route Handler (app/api/auth/login/route.ts), NOT
 * directly from client components.
 */
export async function laravelLogin(
  credentials: LoginCredentials
): Promise<{ ok: boolean; setCookieHeaders: string[] }> {
  // Step 1 — initialise CSRF protection
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: "include",
    cache: "no-store",
  });

  // Step 2 — attempt login
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
    cache: "no-store",
    redirect: "manual",
  });

  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];

  return { ok: res.ok || res.status === 204, setCookieHeaders };
}

/**
 * Call Laravel /logout, clearing the server-side session.
 * Returns the Set-Cookie headers (clearing cookies) to forward to browser.
 */
export async function laravelLogout(sessionValue: string, xsrfValue?: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: `laravel_session=${sessionValue}${xsrfValue ? `; XSRF-TOKEN=${xsrfValue}` : ""}`,
      ...(xsrfValue ? { "X-XSRF-TOKEN": decodeURIComponent(xsrfValue) } : {}),
    },
    cache: "no-store",
  });

  return res.headers.getSetCookie?.() ?? [];
}
