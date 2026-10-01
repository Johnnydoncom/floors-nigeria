"use client";

import { useActionState, useState } from "react";
import { changePassword, updateDetails, updatePreferences } from "@/app/account/actions";
import { fieldError, IDLE } from "@/lib/account/form-state";
import { CONTACT_CHANNELS, CUSTOMER_TYPES, NIGERIAN_STATES, stateLabel } from "@/lib/nigeria";
import type { AuthUser } from "@/lib/api/types";
import { FormAlert, SelectField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({ value: state, label: stateLabel(state) }));

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border">
      <header className="border-b border-border p-6">
        <h2 className="font-display text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function DetailsForm({ user }: { user: AuthUser }) {
  const [state, action] = useActionState(updateDetails, IDLE);
  const profile = user.customer_profile;
  const [email, setEmail] = useState(state.values?.email ?? user.email);
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  const value = (field: string, fallback: string | null | undefined): string =>
    state.values?.[field] ?? fallback ?? "";

  return (
    <Panel
      title="Your details"
      description="How our consultants address you and where you're based."
    >
      <form action={action} className="grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="original_email" value={user.email} />
        <FormAlert state={state} className="sm:col-span-2" />
        <TextField
          name="name"
          label="Full name"
          autoComplete="name"
          required
          defaultValue={value("name", user.name)}
          error={fieldError(state, "name")}
        />
        <TextField
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(state, "email")}
          hint={emailChanged ? "We'll send a link to confirm the new address." : undefined}
        />
        {emailChanged && (
          <TextField
            name="current_password"
            type="password"
            label="Current password"
            autoComplete="current-password"
            required
            fieldClassName="sm:col-span-2"
            error={fieldError(state, "current_password")}
            hint="Required to move your account to a different email address."
          />
        )}
        <TextField
          name="phone"
          type="tel"
          label="Phone number"
          autoComplete="tel"
          inputMode="tel"
          optional
          defaultValue={value("phone", profile?.phone ?? user.phone)}
          error={fieldError(state, "phone")}
        />
        <TextField
          name="whatsapp"
          type="tel"
          label="WhatsApp number"
          inputMode="tel"
          optional
          defaultValue={value("whatsapp", profile?.whatsapp)}
          error={fieldError(state, "whatsapp")}
          hint="If different from your phone number."
        />
        <SelectField
          name="customer_type"
          label="I'm buying as"
          options={CUSTOMER_TYPES}
          defaultValue={value("customer_type", profile?.customer_type ?? "homeowner")}
          error={fieldError(state, "customer_type")}
          fieldClassName="sm:col-span-2"
        />
        <TextField
          name="city"
          label="City / area"
          autoComplete="address-level2"
          optional
          defaultValue={value("city", profile?.city)}
          error={fieldError(state, "city")}
        />
        <SelectField
          name="state"
          label="State"
          optional
          options={STATE_OPTIONS}
          placeholder="Choose a state"
          defaultValue={value("state", profile?.state)}
          error={fieldError(state, "state")}
        />
        <div className="sm:col-span-2">
          <SubmitButton>Save details</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}

export function PreferencesForm({ user }: { user: AuthUser }) {
  const [state, action] = useActionState(updatePreferences, IDLE);
  const profile = user.customer_profile;

  return (
    <Panel title="Communication" description="How we keep in touch about your quotes and projects.">
      <form action={action} className="space-y-6">
        <FormAlert state={state} />
        <fieldset>
          <legend className="text-xs font-semibold">Preferred way to reach you</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {[{ value: "", label: "No preference" }, ...CONTACT_CHANNELS].map((channel) => (
              <label
                key={channel.value}
                className="flex h-11 cursor-pointer items-center gap-2 border border-border px-4 text-sm transition has-[:checked]:border-gold has-[:checked]:bg-gold/5"
              >
                <input
                  type="radio"
                  name="preferred_contact_channel"
                  value={channel.value}
                  defaultChecked={(profile?.preferred_contact_channel ?? "") === channel.value}
                  className="accent-[var(--gold)]"
                />
                {channel.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="marketing_opt_in"
            defaultChecked={profile?.marketing_opt_in ?? false}
            className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
          />
          <span>
            Send me new collections, project stories and offers.
            <span className="block text-xs text-muted-foreground">
              Messages about your own quotes and installation are always sent.
            </span>
          </span>
        </label>
        <SubmitButton>Save preferences</SubmitButton>
      </form>
    </Panel>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, IDLE);

  return (
    <Panel
      title="Password"
      description="Changing your password signs you out on every other device."
    >
      {/* Remounting on success clears the three password fields. */}
      <form
        key={state.status === "success" ? state.submittedAt : "form"}
        action={action}
        className="grid gap-5 sm:grid-cols-2"
      >
        <FormAlert state={state} className="sm:col-span-2" />
        <TextField
          name="current_password"
          type="password"
          label="Current password"
          autoComplete="current-password"
          required
          fieldClassName="sm:col-span-2"
          error={fieldError(state, "current_password")}
        />
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
        <div className="sm:col-span-2">
          <SubmitButton>Change password</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
