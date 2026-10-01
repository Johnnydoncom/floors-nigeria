"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { completeReset, requestReset, signIn, signUp } from "@/app/account/actions";
import { fieldError, IDLE } from "@/lib/account/form-state";
import { FormAlert, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";

/**
 * Sign-in, registration and password recovery. Each posts to a Server Action,
 * so they work before JavaScript has loaded; the token is stored in an
 * HTTP-only cookie on the server and never reaches this code.
 */

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, IDLE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <TextField
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
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
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, IDLE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <TextField
        name="name"
        label="Full name"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={fieldError(state, "name")}
      />
      <TextField
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={fieldError(state, "email")}
        hint="We'll send a link to confirm it's yours."
      />
      <TextField
        name="phone"
        type="tel"
        label="Phone number"
        autoComplete="tel"
        inputMode="tel"
        optional
        placeholder="0803 123 4567"
        defaultValue={state.values?.phone}
        error={fieldError(state, "phone")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          minLength={8}
          required
          error={fieldError(state, "password")}
          hint="At least 8 characters."
        />
        <TextField
          name="password_confirmation"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          error={fieldError(state, "password_confirmation")}
        />
      </div>
      <SubmitButton pendingLabel="Creating your account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestReset, IDLE);

  if (state.status === "success") {
    return (
      <div role="status" className="border border-border bg-surface p-6 text-sm">
        <MailCheck className="h-6 w-6 text-gold" aria-hidden />
        <p className="mt-4 font-display text-lg">Check your inbox</p>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <p className="mt-2 text-muted-foreground">
          The link expires in an hour. Nothing arrived? Check spam, or{" "}
          <Link
            href="/account/forgot-password"
            className="underline underline-offset-4 hover:text-gold"
          >
            try again
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      <TextField
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={fieldError(state, "email")}
      />
      <SubmitButton pendingLabel="Sending…" className="w-full">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(completeReset, IDLE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <FormAlert state={state} />
      <TextField name="email_display" label="Email address" value={email} readOnly disabled />
      {fieldError(state, "email") && (
        <p className="text-sm text-destructive">
          {fieldError(state, "email")}{" "}
          <Link href="/account/forgot-password" className="underline underline-offset-4">
            Request a new link
          </Link>
          .
        </p>
      )}
      <TextField
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        minLength={8}
        required
        error={fieldError(state, "password")}
        hint="At least 8 characters."
      />
      <TextField
        name="password_confirmation"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={fieldError(state, "password_confirmation")}
      />
      <SubmitButton pendingLabel="Saving…" className="w-full">
        Set new password
      </SubmitButton>
    </form>
  );
}
