"use client";

import { useActionState } from "react";
import { MailWarning } from "lucide-react";
import { resendVerification } from "@/app/account/actions";
import { IDLE } from "@/lib/account/form-state";
import { SubmitButton } from "./SubmitButton";

/**
 * Shown until the customer confirms their email. Confirming is also what
 * brings quotes requested before registration into the account.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerification, IDLE);

  return (
    <div className="border border-gold/40 bg-gold/10">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <div>
            <p className="font-semibold">Please confirm your email address</p>
            <p
              className="mt-1 text-muted-foreground"
              role={state.status === "idle" ? undefined : "status"}
            >
              {state.message ??
                `We sent a link to ${email}. Confirming it links any quotes you requested before signing up.`}
            </p>
          </div>
        </div>
        <form action={action} className="shrink-0">
          <SubmitButton pendingLabel="Sending…" className="h-10 px-4 text-xs">
            Resend link
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
