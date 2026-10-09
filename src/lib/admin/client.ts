"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Browser-side calls to the admin API, through `/api/admin/*` (which attaches
 * the session token). Errors carry Laravel's message and field errors so
 * forms can show them in place.
 */

export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function adminRequest<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(`/api/admin/${path.replace(/^\//, "")}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    const message =
      response.status === 403
        ? (payload.message ?? "You do not have permission to do that.")
        : response.status === 401
          ? "Your session has ended. Please sign in again."
          : response.status === 429
            ? "Too many requests. Please wait a moment."
            : (payload.message ?? "Something went wrong. Please try again.");

    throw new AdminRequestError(message, response.status, payload.errors ?? {});
  }

  return payload as T;
}

export function firstError(errors: Record<string, string[]>, field: string): string | undefined {
  return errors[field]?.[0];
}

type RunOptions = {
  /** Toast shown on success; the API's own `message` is used when absent. */
  success?: string | false;
  /** Re-render the server components on the page afterwards (default true). */
  refresh?: boolean;
  /** Navigate somewhere afterwards instead. */
  redirectTo?: string | ((result: unknown) => string);
};

/**
 * Run an admin write with consistent feedback: a pending flag, a toast, field
 * errors for the form, and a refresh of the server-rendered page.
 */
export function useAdminMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const run = useCallback(
    async <T>(call: () => Promise<T>, options: RunOptions = {}): Promise<T | null> => {
      setPending(true);
      setErrors({});

      try {
        const result = await call();
        const message =
          options.success === false
            ? null
            : (options.success ?? (result as { message?: string } | null)?.message ?? "Saved.");

        if (message) toast.success(message);

        if (options.redirectTo) {
          router.push(
            typeof options.redirectTo === "function"
              ? options.redirectTo(result)
              : options.redirectTo,
          );
        } else if (options.refresh !== false) {
          router.refresh();
        }

        return result;
      } catch (error) {
        if (error instanceof AdminRequestError) {
          setErrors(error.errors);
          toast.error(error.message);
          if (error.status === 401)
            router.push(
              `/admin/login?expired=1&next=${encodeURIComponent(window.location.pathname)}`,
            );
        } else {
          console.error(error);
          toast.error("Something went wrong. Please try again.");
        }
        return null;
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  return { run, pending, errors, setErrors };
}
