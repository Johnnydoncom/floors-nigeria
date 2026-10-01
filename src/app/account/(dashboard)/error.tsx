"use client";

import { RotateCcw } from "lucide-react";

/**
 * The API being unreachable should not take the whole account down: the
 * navigation stays usable, and the section can be retried in place.
 */
export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="border border-border px-6 py-12 text-center">
      <p className="font-display text-lg">This section didn&apos;t load</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        We couldn&apos;t reach your account details just now. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center gap-2 border border-border px-5 text-sm font-medium transition hover:border-gold hover:text-gold"
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> Try again
      </button>
    </div>
  );
}
