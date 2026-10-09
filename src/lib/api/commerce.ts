import "server-only";
import { NextResponse } from "next/server";
import { api, ApiError } from "./client";
import { getClientIp, getToken } from "./auth";

/**
 * Cart, checkout and order calls from the browser, relayed to Laravel by
 * Route Handlers. The visitor's session token and real IP are attached here,
 * server-side, so a signed-in customer's order joins their account and rate
 * limits apply per shopper rather than to this server.
 */

type Method = "GET" | "POST";

export async function relay(
  method: Method,
  path: string,
  {
    body,
    query,
    status = 200,
  }: { body?: unknown; query?: Record<string, string | undefined>; status?: number } = {},
): Promise<NextResponse> {
  try {
    const options = {
      body,
      query,
      token: await getToken(),
      clientIp: await getClientIp(),
      cache: "no-store" as const,
    };
    const payload =
      method === "GET"
        ? await api.get<unknown>(path, options)
        : await api.post<unknown>(path, options);

    return NextResponse.json(payload, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[commerce]", path, error);
    return NextResponse.json(
      { message: "We could not reach our store just now. Please try again in a moment." },
      { status: 502 },
    );
  }
}

/** Order references look like `ORD-2026-000123`. */
export function isOrderReference(value: string): boolean {
  return /^[A-Z]{2,5}-\d{4}-\d{3,10}$/.test(value);
}
