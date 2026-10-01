"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { login, logout, register, requestPasswordReset, resetPassword } from "@/lib/api/auth";
import {
  deleteAddress,
  deleteVisualization,
  makeDefaultAddress,
  removeFavorite,
  resendVerificationEmail,
  saveAddress,
  updatePassword,
  updateProfile,
} from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { safeRedirectPath, type FormState } from "@/lib/account/form-state";

/**
 * Server Actions for the customer account (§14). Each validates locally for a
 * fast answer, then lets the API have the final word; the API's validation
 * errors are returned keyed by field so the form can show them in place.
 */

const PASSWORD_MIN = 8;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const phone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\+?[0-9\s\-()]{7,30}$/.test(value), {
    message: "Enter a phone number using digits, spaces or a leading +.",
  })
  .transform((value) => value || null);

const nigerianState = z.enum(NIGERIAN_STATES, {
  errorMap: () => ({ message: "Choose a Nigerian state." }),
});

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(200);

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Everything the customer typed except passwords, for re-filling the form. */
function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.includes("password") && !key.startsWith("$")) {
      values[key] = value;
    }
  });
  return values;
}

function invalid(error: z.ZodError, formData: FormData): FormState {
  return {
    status: "error",
    message: "Please check the highlighted fields.",
    errors: error.flatten().fieldErrors as Record<string, string[]>,
    values: echo(formData),
    submittedAt: Date.now(),
  };
}

function failed(error: unknown, formData?: FormData): FormState {
  const values = formData ? echo(formData) : undefined;

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        status: "error",
        message: "Too many attempts. Please wait a minute and try again.",
        values,
        submittedAt: Date.now(),
      };
    }

    if (error.status === 422) {
      return {
        status: "error",
        message: error.userMessage,
        errors: error.validationErrors,
        values,
        submittedAt: Date.now(),
      };
    }
  }

  console.error("[account]", error);

  return {
    status: "error",
    message: "We couldn't save that just now. Please try again in a moment.",
    values,
    submittedAt: Date.now(),
  };
}

function succeeded(message: string): FormState {
  return { status: "success", message, submittedAt: Date.now() };
}

/**
 * Run an API call, turning failures into form state. Redirects thrown by the
 * data layer (an expired session) must escape, so they are re-thrown.
 */
async function attempt(
  call: () => Promise<unknown>,
  formData?: FormData,
): Promise<FormState | null> {
  try {
    await call();
    return null;
  } catch (error) {
    unstable_rethrow(error);
    return failed(error, formData);
  }
}

// --- Authentication ---------------------------------------------------------

const signInSchema = z.object({
  email: z.string().trim().email("Enter the email address you registered with."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  const failure = await attempt(() => login(parsed.data), formData);
  if (failure) return failure;

  redirect(safeRedirectPath(text(formData, "next")));
}

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z.string().trim().email("Enter a valid email address.").max(180),
    phone,
    password: newPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  });

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    password: text(formData, "password"),
    password_confirmation: text(formData, "password_confirmation"),
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  const failure = await attempt(
    () => register({ ...parsed.data, phone: parsed.data.phone ?? undefined }),
    formData,
  );
  if (failure) return failure;

  redirect(safeRedirectPath(text(formData, "next")));
}

export async function signOut(): Promise<void> {
  await logout();
  redirect("/account/login?signed_out=1");
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.string().trim().email("Enter the email address you registered with.") })
    .safeParse({ email: text(formData, "email") });

  if (!parsed.success) return invalid(parsed.error, formData);

  let message = "";
  const failure = await attempt(async () => {
    message = await requestPasswordReset(parsed.data.email);
  }, formData);

  return failure ?? succeeded(message);
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    email: z.string().trim().email(),
    password: newPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  });

export async function completeReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: text(formData, "token"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    password_confirmation: text(formData, "password_confirmation"),
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  const failure = await attempt(() => resetPassword(parsed.data), formData);
  if (failure) return failure;

  redirect("/account/login?reset=1");
}

export async function resendVerification(): Promise<FormState> {
  let message = "";
  const failure = await attempt(async () => {
    message = await resendVerificationEmail();
  });

  return failure ?? succeeded(message);
}

// --- Profile ----------------------------------------------------------------

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(180),
  current_password: z.string().optional(),
  phone,
  whatsapp: phone,
  customer_type: z.string().min(1, "Tell us who you are buying for."),
  city: optionalText(120),
  state: z.union([nigerianState, z.literal("").transform(() => null)]),
});

export async function updateDetails(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = detailsSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    current_password: text(formData, "current_password") || undefined,
    phone: text(formData, "phone"),
    whatsapp: text(formData, "whatsapp"),
    customer_type: text(formData, "customer_type"),
    city: text(formData, "city"),
    state: text(formData, "state"),
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  const emailChanged =
    parsed.data.email.toLowerCase() !== text(formData, "original_email").trim().toLowerCase();

  // The password only authorises an email change; sending it otherwise would
  // fail validation for a field the customer was never asked to fill.
  const { current_password: currentPassword, ...details } = parsed.data;
  const changes = emailChanged ? { ...details, current_password: currentPassword ?? "" } : details;

  const failure = await attempt(() => updateProfile(changes), formData);
  if (failure) return failure;

  refresh();

  return succeeded(
    emailChanged
      ? `Saved. We've sent a link to ${parsed.data.email} to confirm the new address.`
      : "Your details have been saved.",
  );
}

export async function updatePreferences(_: FormState, formData: FormData): Promise<FormState> {
  const channel = text(formData, "preferred_contact_channel");

  const parsed = z
    .object({
      marketing_opt_in: z.boolean(),
      preferred_contact_channel: z.enum(["email", "phone", "whatsapp"]).nullable(),
    })
    .safeParse({
      marketing_opt_in: formData.get("marketing_opt_in") === "on",
      preferred_contact_channel: channel === "" ? null : channel,
    });

  if (!parsed.success) return invalid(parsed.error, formData);

  const failure = await attempt(() => updateProfile(parsed.data), formData);
  if (failure) return failure;

  refresh();

  return succeeded("Your preferences have been saved.");
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: newPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse({
    current_password: text(formData, "current_password"),
    password: text(formData, "password"),
    password_confirmation: text(formData, "password_confirmation"),
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  let message = "";
  const failure = await attempt(async () => {
    message = await updatePassword(parsed.data);
  }, formData);

  return failure ?? succeeded(message);
}

// --- Address book -----------------------------------------------------------

const addressSchema = z.object({
  label: z.string().trim().min(1, "Give this address a name, like Home or Site office.").max(60),
  recipient_name: optionalText(120),
  phone,
  address_line: z.string().trim().min(5, "Enter the street address.").max(255),
  landmark: optionalText(255),
  city: z.string().trim().min(2, "Enter the city or area.").max(120),
  state: nigerianState,
  is_default: z.boolean(),
});

export async function saveAddressAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = addressSchema.safeParse({
    label: text(formData, "label"),
    recipient_name: text(formData, "recipient_name"),
    phone: text(formData, "phone"),
    address_line: text(formData, "address_line"),
    landmark: text(formData, "landmark"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    is_default: formData.get("is_default") === "on",
  });

  if (!parsed.success) return invalid(parsed.error, formData);

  const rawId = Number(text(formData, "id"));
  const id = Number.isInteger(rawId) && rawId > 0 ? rawId : undefined;

  const failure = await attempt(() => saveAddress(parsed.data, id), formData);
  if (failure) return failure;

  refresh();

  return succeeded(id ? "Address updated." : "Address added.");
}

function positiveId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error("Invalid id");
  return value;
}

export async function deleteAddressAction(id: number): Promise<FormState> {
  const failure = await attempt(() => deleteAddress(positiveId(id)));
  if (failure) return failure;

  refresh();
  return succeeded("Address removed.");
}

export async function makeDefaultAddressAction(id: number): Promise<FormState> {
  const failure = await attempt(() => makeDefaultAddress(positiveId(id)));
  if (failure) return failure;

  refresh();
  return succeeded("Default address updated.");
}

// --- Saved items ------------------------------------------------------------

export async function removeFavoriteAction(slug: string): Promise<FormState> {
  const failure = await attempt(() => removeFavorite(slug));
  if (failure) return failure;

  refresh();
  return succeeded("Removed from your saved products.");
}

export async function deleteVisualizationAction(shareToken: string): Promise<FormState> {
  const failure = await attempt(() => deleteVisualization(shareToken));
  if (failure) return failure;

  refresh();
  return succeeded("Visualisation deleted. Its share link no longer works.");
}
