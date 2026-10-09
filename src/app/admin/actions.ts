"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logout, staffLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { FormState } from "@/lib/account/form-state";

/**
 * Sign-in and sign-out for the staff workspace — separate from the customer
 * account so staff never pass through the shop's account pages.
 */

const schema = z.object({
  email: z.string().trim().email("Enter your work email address."),
  password: z.string().min(1, "Enter your password."),
});

/** Only paths inside the workspace may be a destination after sign-in. */
export async function workspacePath(value: unknown): Promise<string> {
  if (
    typeof value !== "string" ||
    !value.startsWith("/admin") ||
    value.startsWith("/admin/login")
  ) {
    return "/admin";
  }

  try {
    const url = new URL(value, "http://workspace.local");
    return url.origin === "http://workspace.local" && url.pathname.startsWith("/admin")
      ? `${url.pathname}${url.search}`
      : "/admin";
  } catch {
    return "/admin";
  }
}

export async function staffSignIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = schema.safeParse({ email, password: String(formData.get("password") ?? "") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      values: { email },
      submittedAt: Date.now(),
    };
  }

  try {
    await staffLogin(parsed.data);
  } catch (error) {
    unstable_rethrow(error);

    const message =
      error instanceof ApiError && error.status === 429
        ? "Too many attempts. Please wait a minute and try again."
        : error instanceof ApiError && error.status === 422
          ? (error.validationErrors.email?.[0] ?? error.userMessage)
          : "Sign-in is unavailable right now. Please try again in a moment.";

    if (!(error instanceof ApiError)) console.error("[admin:sign-in]", error);

    return { status: "error", message, values: { email }, submittedAt: Date.now() };
  }

  redirect(await workspacePath(formData.get("next")));
}

export async function staffSignOut(): Promise<void> {
  await logout();
  redirect("/admin/login?signed_out=1");
}
