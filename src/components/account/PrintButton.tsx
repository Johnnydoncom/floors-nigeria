"use client";

import { Printer } from "lucide-react";

/** Print, or save as PDF from the browser's print dialog. */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 border border-border px-4 text-sm font-medium transition hover:border-gold hover:text-gold"
    >
      <Printer className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
