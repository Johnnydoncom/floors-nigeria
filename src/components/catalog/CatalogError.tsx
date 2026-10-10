"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The catalogue fallback UI.
 *
 * Shared by the `/products` error boundary and the product detail page's, so a
 * failure reads the same wherever the shopper lands.
 */
export function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Catalogue failed to load", error);
  }, [error]);

  return (
    <section className="container-fluid grid min-h-[60vh] place-items-center py-24 text-center">
      <div className="max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">Catalogue</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight">
          We could not load the catalogue.
        </h1>
        <p className="mt-4 text-muted-foreground">
          This is usually temporary. Try again, and if it persists our team is on WhatsApp.
        </p>
        <Button onClick={reset} className="mt-8 rounded-none">
          Try again
        </Button>
      </div>
    </section>
  );
}
