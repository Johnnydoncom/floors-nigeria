"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * A page in the workspace failed — usually the API is unreachable, or the
 * role no longer allows what the page loads.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-8 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-gold" aria-hidden />
      <h1 className="mt-3 font-display text-xl">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The CRM may be unreachable, or your role may not include this area. Try again, and if it
        keeps happening, tell an administrator{error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6 h-10 rounded-md">
        <RotateCcw className="h-4 w-4" aria-hidden /> Try again
      </button>
    </div>
  );
}
