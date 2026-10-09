import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { api, ApiError } from "./client";
import type { AuthUser, Envelope } from "./types";

/**
 * Authentication against the Laravel API (§19, §27).
 *
 * Laravel issues a Sanctum token; that token is stored in an HTTP-only cookie
 * set by our Route Handlers and Server Actions, and is never readable by
 * browser JavaScript.
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

export type PasswordReset = {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
};

type TokenResponse = Envelope<{ token: string; user: AuthUser }>;
type MessageResponse = { message: string };

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

/**
 * The visitor's address, as reported by the platform's edge proxy, for
 * per-visitor rate limiting in Laravel.
 *
 * `x-real-ip` is preferred: proxies set it from the socket, whereas the first
 * `x-forwarded-for` entry is whatever the client sent when a proxy appends
 * rather than replaces. Laravel also throttles per email address, so an
 * attacker rotating spoofed addresses still cannot hammer one account.
 */
export async function getClientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();

  return realIp || forwarded || undefined;
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
    clientIp: await getClientIp(),
  });

  await storeToken(data.token);
  return data;
}

/**
 * Sign in to the staff workspace. The API only issues a token to active
 * staff, so a customer's password never opens a workspace session.
 */
export async function staffLogin(credentials: Credentials): Promise<TokenResponse["data"]> {
  const { data } = await api.post<TokenResponse>("/v1/auth/staff-login", {
    body: credentials,
    clientIp: await getClientIp(),
  });

  await storeToken(data.token);
  return data;
}

export async function register(details: RegistrationDetails): Promise<TokenResponse["data"]> {
  const { data } = await api.post<TokenResponse>("/v1/auth/register", {
    body: { ...details, session_token: await getGuestSessionToken() },
    clientIp: await getClientIp(),
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
 * Always resolves with the same message whether or not the account exists,
 * so the form cannot be used to discover registered addresses.
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const { message } = await api.post<MessageResponse>("/v1/auth/forgot-password", {
    body: { email },
    clientIp: await getClientIp(),
  });

  return message;
}

export async function resetPassword(details: PasswordReset): Promise<string> {
  const { message } = await api.post<MessageResponse>("/v1/auth/reset-password", {
    body: details,
    clientIp: await getClientIp(),
  });

  return message;
}

export type EmailVerificationLink = {
  id: string;
  hash: string;
  expires: string;
  signature: string;
};

/**
 * Confirms an address from the signed link in the verification email. The
 * signature is the credential, so this works on a device that is not signed in.
 */
export async function verifyEmail(link: EmailVerificationLink): Promise<boolean> {
  try {
    await api.post(
      `/v1/auth/verify-email/${encodeURIComponent(link.id)}/${encodeURIComponent(link.hash)}`,
      {
        query: { expires: link.expires, signature: link.signature },
        clientIp: await getClientIp(),
      },
    );
    return true;
  } catch (error) {
    if (error instanceof ApiError && [403, 404].includes(error.status)) return false;
    throw error;
  }
}

/**
 * The signed-in user, or null. Never cached across requests — auth state is
 * per request — but memoised within one, so the layout and page share a call.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const token = await getToken();

  if (!token) return null;

  try {
    const { data } = await api.get<Envelope<AuthUser>>("/v1/me", { token });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});
