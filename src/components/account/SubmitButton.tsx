"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 bg-charcoal-dark px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark disabled:cursor-wait disabled:opacity-70";

export const secondaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 border border-border px-6 text-sm font-medium transition hover:border-gold hover:text-gold disabled:opacity-60";

/**
 * Disables itself while its form's Server Action is running, so a slow
 * connection cannot submit the same change twice.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(primaryButtonClass, className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
