"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Sample request capture in the footer.
 *
 * Isolated as a client island so the footer itself stays a Server Component
 * and ships no JavaScript on content pages (§19, §28).
 */
export function SampleRequestForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");

  return (
    <form
      className={cn("flex flex-col gap-3 sm:flex-row", className)}
      onSubmit={(event) => {
        event.preventDefault();
        // Wired to the quote/lead endpoint when sample requests ship (§4).
        toast.success("Thank you — a consultant will be in touch about samples.");
        setEmail("");
      }}
    >
      <label htmlFor="sample-email" className="sr-only">
        Work email address
      </label>
      <input
        id="sample-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Work email address"
        className="h-12 flex-1 rounded-md border border-white/15 bg-white/5 px-4 text-sm text-primary-foreground transition placeholder:text-primary-foreground/45 focus:border-gold focus:outline-none"
      />
      <button type="submit" className="btn btn-gold">
        Request samples <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}
