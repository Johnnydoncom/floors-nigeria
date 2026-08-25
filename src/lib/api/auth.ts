import "server-only";
import { cookies } from "next/headers";
import { api, ApiError } from "./client";
import type { AuthUser, Envelope } from "./types";

/**
 * Authentication against the Laravel API (§19, §27).
 *
 * Laravel issues a Sanctum token; that token is stored in an HTTP-only cookie
 * set by our Route Handlers and is never readable by browser JavaScript.
 */

export const AUTH_COOKIE = "floorsng_token";
export const SESSION_COOKIE = "floorsng_session";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Credentials = { email: string; password: string };

export type RegistrationDetails = Credentials & {
  name: string;
  password_confirmation: string;
  phone?: string;
};

type TokenResponse = Envelope<{ token: string; user: AuthUser }>;

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

/**
 * Anonymous identifier for calculations, visualizations and designs saved
 * before sign-up; the API claims them on the visitor's next login (§14).
 */
export async function getGuestSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function storeToken(token: string): Promise<void> {
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}

export async function login(credentials: Credentials): Promise<TokenResponse["data"]> {
  const { data } = await api.post<TokenResponse>("/v1/auth/login", {
    body: { ...credentials, session_token: await getGuestSessionToken() },
  });

  await storeToken(data.token);
  return data;
}

export async function register(details: RegistrationDetails): Promise<TokenResponse["data"]> {
  const { data } = await api.post<TokenResponse>("/v1/auth/register", {
    body: { ...details, session_token: await getGuestSessionToken() },
  });

  await storeToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  const token = await getToken();

  if (token) {
    await api.post("/v1/auth/logout", { token }).catch(() => undefined);
  }

  await clearToken();
}

/**
 * The signed-in user, or null. Never cached — auth state must be per request.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getToken();

  if (!token) return null;

  try {
    const { data } = await api.get<Envelope<AuthUser>>("/v1/me", { token });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
