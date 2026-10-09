import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { api, ApiError, type QueryParams } from "./client";
import { getClientIp, getToken } from "./auth";
import type { AdminSession, CatalogLookups, Lookups } from "@/lib/admin/types";

/**
 * The admin/CRM API (§15), read as the signed-in member of staff.
 *
 * Nothing here is cached across requests — it is one person's view of the
 * business, scoped by their role. An expired session goes back to sign-in; a
 * record that is missing or not theirs renders the not-found page.
 */

export class AdminAccessError extends Error {
  constructor(message = "You do not have access to this part of the workspace.") {
    super(message);
    this.name = "AdminAccessError";
  }
}

function signIn(path = "/admin"): never {
  redirect(`/admin/login?expired=1&next=${encodeURIComponent(path)}`);
}

/**
 * GET an admin endpoint. `path` is relative to `/v1/admin`.
 */
export async function adminGet<T>(path: string, query?: QueryParams): Promise<T> {
  const token = await getToken();

  if (!token) signIn();

  try {
    return await api.get<T>(`/v1/admin/${path.replace(/^\//, "")}`, {
      token,
      query,
      clientIp: await getClientIp(),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) signIn();
      if (error.status === 404) notFound();
      if (error.status === 403) throw new AdminAccessError(error.userMessage);
    }
    throw error;
  }
}

/**
 * The signed-in member of staff and what they may do, or null for a visitor
 * who is signed in but is not staff. Memoised within one request so the
 * layout and page share a call.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = await getToken();

  if (!token) signIn();

  try {
    const { data } = await api.get<{ data: AdminSession }>("/v1/admin/session", {
      token,
      clientIp: await getClientIp(),
      cache: "no-store",
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) signIn();
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  }
});

export const getLookups = cache(async (): Promise<Lookups> => {
  const { data } = await adminGet<{ data: Lookups }>("lookups");
  return data;
});

export const getCatalogLookups = cache(async (): Promise<CatalogLookups> => {
  const { data } = await adminGet<{ data: CatalogLookups }>("lookups/catalog");
  return data;
});

/**
 * The session for a page inside the workspace. The admin layout has already
 * turned away anyone who is not staff, so a null here cannot happen in
 * practice; it is treated as an expired session.
 */
export async function requireSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) signIn();

  return session;
}
