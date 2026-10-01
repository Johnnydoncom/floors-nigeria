import "server-only";
import { redirect } from "next/navigation";
import { api, ApiError, type RequestOptions } from "./client";
import { getClientIp, getToken } from "./auth";
import type { SavedVisualization } from "./visualizations";
import type {
  AccountProject,
  AccountSummary,
  Address,
  Appointment,
  AuthUser,
  ContactChannel,
  Envelope,
  Paginated,
  ProductCard,
  Quote,
} from "./types";

/**
 * The customer account (§14), read and written as the signed-in customer.
 *
 * Nothing here is cached: every response is one person's data. Reads send a
 * visitor whose session has expired back to sign in; writes surface the API's
 * validation errors to the form that made them.
 */

export const SIGN_IN_PATH = "/account/login";

/**
 * Make an authenticated call. A missing or rejected token means the session
 * is over, so the visitor is sent to sign in rather than shown an error.
 */
async function authed<T>(
  call: (options: RequestOptions) => Promise<T>,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getToken();

  if (!token) redirect(`${SIGN_IN_PATH}?expired=1`);

  try {
    return await call({ ...options, token, clientIp: await getClientIp() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`${SIGN_IN_PATH}?expired=1`);
    }
    throw error;
  }
}

/** Resolves to null instead of throwing when the record is not the customer's. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && [403, 404].includes(error.status)) return null;
    throw error;
  }
}

// --- Reads ------------------------------------------------------------------

export async function getAccountSummary(): Promise<AccountSummary> {
  const { data } = await authed((o) => api.get<Envelope<AccountSummary>>("/v1/me/summary", o));
  return data;
}

export async function getProjects(): Promise<AccountProject[]> {
  const { data } = await authed((o) => api.get<Paginated<AccountProject>>("/v1/me/projects", o));
  return data;
}

export async function getAppointments(): Promise<{ upcoming: Appointment[]; past: Appointment[] }> {
  const { data } = await authed((o) =>
    api.get<Envelope<{ upcoming: Appointment[]; past: Appointment[] }>>("/v1/me/appointments", o),
  );
  return data;
}

export async function getQuotes(page = 1): Promise<Paginated<Quote>> {
  return authed((o) => api.get<Paginated<Quote>>("/v1/me/quotes", { ...o, query: { page } }));
}

export async function getQuote(reference: string): Promise<Quote | null> {
  const response = await orNull(
    authed((o) => api.get<Envelope<Quote>>(`/v1/me/quotes/${encodeURIComponent(reference)}`, o)),
  );
  return response?.data ?? null;
}

export async function getFavorites(): Promise<ProductCard[]> {
  const { data } = await authed((o) => api.get<Envelope<ProductCard[]>>("/v1/me/favorites", o));
  return data;
}

export async function getSavedVisualizations(): Promise<SavedVisualization[]> {
  const { data } = await authed((o) =>
    api.get<Paginated<SavedVisualization>>("/v1/me/visualizations", o),
  );
  return data;
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await authed((o) => api.get<Envelope<Address[]>>("/v1/me/addresses", o));
  return data;
}

// --- Writes -----------------------------------------------------------------

export type ProfileChanges = Partial<{
  name: string;
  email: string;
  current_password: string;
  phone: string | null;
  whatsapp: string | null;
  customer_type: string;
  city: string | null;
  state: string | null;
  marketing_opt_in: boolean;
  preferred_contact_channel: ContactChannel | null;
}>;

export async function updateProfile(changes: ProfileChanges): Promise<AuthUser> {
  const { data } = await authed((o) =>
    api.patch<Envelope<AuthUser>>("/v1/me", { ...o, body: changes }),
  );
  return data;
}

export async function updatePassword(body: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<string> {
  const { message } = await authed((o) =>
    api.put<{ message: string }>("/v1/me/password", { ...o, body }),
  );
  return message;
}

export async function resendVerificationEmail(): Promise<string> {
  const { message } = await authed((o) =>
    api.post<{ message: string }>("/v1/me/email/verification-notification", o),
  );
  return message;
}

export type AddressInput = Omit<Address, "id" | "is_default"> & { is_default?: boolean };

export async function saveAddress(input: AddressInput, id?: number): Promise<Address> {
  const { data } = await authed((o) =>
    id === undefined
      ? api.post<Envelope<Address>>("/v1/me/addresses", { ...o, body: input })
      : api.put<Envelope<Address>>(`/v1/me/addresses/${id}`, { ...o, body: input }),
  );
  return data;
}

export async function makeDefaultAddress(id: number): Promise<void> {
  await authed((o) => api.put(`/v1/me/addresses/${id}/default`, o));
}

export async function deleteAddress(id: number): Promise<void> {
  await authed((o) => api.delete(`/v1/me/addresses/${id}`, o));
}

export async function addFavorite(productId: number, variantId?: number | null): Promise<void> {
  await authed((o) =>
    api.post("/v1/me/favorites", {
      ...o,
      body: { product_id: productId, product_variant_id: variantId ?? null },
    }),
  );
}

export async function removeFavorite(productSlug: string): Promise<void> {
  await authed((o) => api.delete(`/v1/me/favorites/${encodeURIComponent(productSlug)}`, o));
}

export async function deleteVisualization(shareToken: string): Promise<void> {
  await authed((o) => api.delete(`/v1/me/visualizations/${encodeURIComponent(shareToken)}`, o));
}
