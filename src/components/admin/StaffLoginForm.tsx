"use client";

import Link from "next/link";
import { useActionState } from "react";
import { staffSignIn } from "@/app/admin/actions";
import { FormAlert, TextField } from "@/components/account/fields";
import { SubmitButton } from "@/components/account/SubmitButton";
import { fieldError, IDLE } from "@/lib/account/form-state";

/**
 * Staff sign-in. Posts to a Server Action, so it works before JavaScript has
 * loaded; the session token lands in an HTTP-only cookie on the server.
 */
export function StaffLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(staffSignIn, IDLE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <TextField
        name="email"
        type="email"
        label="Work email"
        autoComplete="username"
        inputMode="email"
        required
        autoFocus
        defaultValue={state.values?.email}
        error={fieldError(state, "email")}
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={fieldError(state, "password")}
        hint={
          <Link
            href="/account/forgot-password"
            className="underline-offset-4 hover:text-gold hover:underline"
          >
            Forgotten your password?
          </Link>
        }
      />
      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in to the workspace
      </SubmitButton>
    </form>
  );
}
