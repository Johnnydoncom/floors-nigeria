"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useCart, unitSymbol } from "@/lib/cart";
import { number } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Links elsewhere on the site open the form already set up for what the
 * visitor clicked — "Order samples" arrives as a sample request.
 */
const ENQUIRIES = {
  samples: {
    title: "Sample request",
    note: "Tell us which floors you'd like to see — up to five samples, delivered nationwide.",
    message: "I'd like to order samples of: ",
  },
  trade: {
    title: "Trade account application",
    note: "For architects, contractors and developers: project pricing and a dedicated account manager.",
    message: "I'd like to open a trade account for my firm. Typical project size: ",
  },
  quote: {
    title: "Quotation request",
    note: "We'll price the items in your cart with delivery and installation, and send a written quotation.",
    message: "Please quote for the items in my cart. Site location and timing: ",
  },
} as const;

export type Enquiry = keyof typeof ENQUIRIES;

function isEnquiry(value: string | null): value is Enquiry {
  // Own keys only: `in` would also accept inherited names like "toString".
  return value !== null && Object.hasOwn(ENQUIRIES, value);
}

const PROJECT_TYPES = ["Residential", "Commercial", "Hospitality", "Healthcare", "Retail", "Other"];

const control =
  "mt-2 w-full rounded-md border border-border bg-background px-4 outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

function Field({
  label,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input {...rest} aria-invalid={error ? true : undefined} className={cn(control, "h-12")} />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/** Form fields carry the API's dotted names (`contact.email`) as their error keys. */
function firstErrors(errors: Record<string, string[]> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors ?? {}).map(([key, messages]) => [key, messages[0]]),
  );
}

/**
 * The consultation enquiry form — the only interactive part of the contact
 * page, so it is the only part that ships JavaScript.
 */
export function ContactForm({ enquiry, email }: { enquiry?: Enquiry; email?: string }) {
  const cart = useCart();
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const preset = enquiry ? ENQUIRIES[enquiry] : null;
  const items = enquiry === "quote" ? cart.items : [];

  /**
   * Every enquiry becomes a lead and a quote in the CRM (§13), through the
   * same endpoint as the visualizer, so sales work one queue. A quotation
   * request carries the cart as priced lines.
   */
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const company = String(data.get("company") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const body = new FormData();

    body.append("contact[full_name]", String(data.get("name") ?? "").trim());
    body.append("contact[email]", String(data.get("email") ?? "").trim());
    body.append("contact[phone]", String(data.get("phone") ?? "").trim());
    body.append("project[type]", projectType);
    body.append("source", "quote_form");
    body.append("consent_given", data.get("consent") ? "1" : "0");
    body.append(
      "notes",
      [preset ? `${preset.title}.` : null, company ? `Company: ${company}.` : null, message]
        .filter(Boolean)
        .join("\n"),
    );
    if (enquiry) body.append("attribution[enquiry]", enquiry);
    items.forEach((item, index) => {
      body.append(`items[${index}][product_variant_id]`, String(item.variantId));
      body.append(`items[${index}][quantity]`, String(item.qty));
    });

    setPending(true);
    setErrors({});

    try {
      const response = await fetch("/api/leads", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as {
        reference?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const fieldErrors = firstErrors(payload.errors);
        setErrors(fieldErrors);
        toast.error(Object.values(fieldErrors)[0] ?? payload.message ?? "We could not send that.");
        return;
      }

      setSent(payload.reference ?? "");
      toast.success("Thanks — a specifier will reach out within one working day.");
    } catch {
      toast.error("We could not send that just now. Please try again, or message us on WhatsApp.");
    } finally {
      setPending(false);
    }
  }

  if (sent !== null) {
    return (
      <div
        className="rounded-xl border border-border bg-surface p-8 text-center md:p-12"
        role="status"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold text-charcoal-dark">
          <Check className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-2xl tracking-tight">
          Thank you — we have your enquiry
        </h2>
        <p className="mt-3 text-muted-foreground">
          A specifier will contact you within one working day
          {sent ? (
            <>
              . Your reference is <span className="font-mono text-foreground">{sent}</span>
            </>
          ) : null}
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-xl border border-border bg-surface p-6 md:p-10"
    >
      {preset && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-4">
          <p className="font-display font-semibold">{preset.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{preset.note}</p>
          {items.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-gold/30 pt-3 text-sm">
              {items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-3">
                  <span className="truncate">
                    {item.name} — {item.variant}
                  </span>
                  <span className="shrink-0 font-mono">
                    {number(item.qty)} {unitSymbol(item.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Adaora Nwosu"
          required
          error={errors["contact.full_name"]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={email}
          error={errors["contact.email"]}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          error={errors["contact.phone"]}
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
          defaultValue={preset?.message}
          placeholder="Tell us about the project — location, area, timeline…"
          className={cn(control, "p-4")}
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[var(--charcoal)]" />
        <span>
          Floor Nigeria may contact me about this enquiry by phone, WhatsApp or email.
          {errors.consent_given && (
            <span className="mt-1 block text-destructive">{errors.consent_given}</span>
          )}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <>
            Send enquiry <Send className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}

/**
 * The form preset from `?enquiry=` in the URL. Reading the URL makes this
 * request-time, so the page renders it inside Suspense with the plain form
 * as the prerendered fallback.
 */
export function ContactFormFromQuery() {
  const params = useSearchParams();
  const enquiry = params.get("enquiry");

  // Remount when the preset changes so the message default is applied.
  return (
    <ContactForm
      key={enquiry ?? "none"}
      enquiry={isEnquiry(enquiry) ? enquiry : undefined}
      email={params.get("email") ?? undefined}
    />
  );
}
