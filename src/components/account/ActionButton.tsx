"use client";

import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FormState } from "@/lib/account/form-state";
import { cn } from "@/lib/utils";

/**
 * Runs a bound Server Action for a small, easily undone change — removing a
 * saved product, choosing a default address — and reports the outcome.
 */
export function ActionButton({
  action,
  children,
  className,
  label,
}: {
  action: () => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Accessible name when the visible content is only an icon or is ambiguous. */
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.status === "error") {
            toast.error(result.message ?? "That didn't work. Please try again.");
          } else if (result.message) {
            toast.success(result.message);
          }
        })
      }
      className={cn("inline-flex items-center gap-1.5 transition disabled:opacity-60", className)}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
