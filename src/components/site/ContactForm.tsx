"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROJECT_TYPES = ["Residential", "Commercial", "Hospitality", "Healthcare", "Retail", "Other"];

const control =
  "mt-2 w-full rounded-md border border-border bg-background px-4 outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input {...rest} className={cn(control, "h-12")} />
    </label>
  );
}

/**
 * The consultation enquiry form — the only interactive part of the contact
 * page, so it is the only part that ships JavaScript.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // Wired to POST /v1/quotes when the storefront enquiry flow ships.
        setSent(true);
        toast.success("Thanks — a specifier will reach out within 24 hours.");
      }}
      className="space-y-5 rounded-xl border border-border bg-surface p-6 md:p-10"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name" name="name" autoComplete="name" placeholder="Adaora Nwosu" />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
        />
        <Field
          label="Company / firm"
          name="company"
          autoComplete="organization"
          placeholder="Cobalt Partners"
        />
      </div>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Project type
        </legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
          {PROJECT_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              role="radio"
              aria-checked={projectType === type}
              onClick={() => setProjectType(type)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm transition",
                projectType === type
                  ? "border-charcoal bg-charcoal text-primary-foreground"
                  : "border-border bg-background hover:border-foreground/40",
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Message
        </span>
        <textarea
          name="message"
          rows={5}
          placeholder="Tell us about the project — location, area, timeline…"
          className={cn(control, "p-4")}
        />
      </label>

      <button type="submit" className="btn btn-primary w-full">
        {sent ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Message sent
          </>
        ) : (
          <>
            Send enquiry <Send className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
