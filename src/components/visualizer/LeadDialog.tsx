"use client";

import { useState, type InputHTMLAttributes } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { number } from "@/lib/format";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

export type LeadKind = "quote" | "sample";

const COPY: Record<LeadKind, { title: string; description: string; submit: string }> = {
  quote: {
    title: "Request a quote",
    description:
      "A consultant will price this floor for your room — material, installation and delivery — and send it to you. Your visualisation is attached so they can see the room.",
    submit: "Send quote request",
  },
  sample: {
    title: "Order a sample",
    description:
      "See and feel the real thing in your own light before you decide. Tell us where to send it and a consultant will confirm.",
    submit: "Order sample",
  },
};

/**
 * Quote requests and sample orders from the visualizer (§13).
 *
 * Both reach the CRM as a quote with source `visualizer`, the material as a
 * line item and the visitor's render attached, so the consultant who calls
 * back has already seen the room. Prices are never sent from here — the
 * server prices the line from live data.
 */
export function LeadDialog({
  kind,
  open,
  onOpenChange,
  material,
  areaSqm,
  render,
  shareUrl,
  designNote,
}: {
  kind: LeadKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: TextureChoice | null;
  /** Area with waste, from the estimator, when the visitor gave one. */
  areaSqm: number | null;
  /** The current visualisation, to attach. */
  render: () => Promise<Blob | null>;
  shareUrl: string | null;
  /** Layout, size and finish, so the consultant quotes what was visualised. */
  designNote: string;
}) {
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);
  const copy = COPY[kind];

  const submit = async (form: HTMLFormElement) => {
    if (!material) return;

    const fields = new FormData(form);
    const body = new FormData();
    const value = (name: string) => String(fields.get(name) ?? "").trim();

    body.append("contact[full_name]", value("name"));
    if (value("email")) body.append("contact[email]", value("email"));
    if (value("phone")) body.append("contact[phone]", value("phone"));
    if (value("phone")) body.append("contact[whatsapp]", value("phone"));
    if (value("city")) body.append("contact[city]", value("city"));
    if (value("address")) body.append("contact[address_line]", value("address"));
    if (value("city")) body.append("project[city]", value("city"));

    body.append("project[type]", kind === "sample" ? "Sample request" : "Room visualizer quote");
    body.append("source", "visualizer");
    body.append("consent_given", fields.get("consent") ? "1" : "0");

    const finish = material.variantName ? ` — ${material.variantName}` : "";

    if (material.productId) body.append("items[0][product_id]", String(material.productId));

    if (kind === "sample") {
      // A sample is a free line, so no variation is sent for the server to price.
      body.append(
        "items[0][description]",
        `Sample: ${material.productName}${finish}`.slice(0, 200),
      );
      body.append("items[0][quantity]", "1");
    } else {
      if (material.variantId)
        body.append("items[0][product_variant_id]", String(material.variantId));
      body.append("items[0][description]", `${material.productName}${finish}`.slice(0, 200));
      body.append("items[0][quantity]", String(Math.max(1, Math.ceil(areaSqm ?? 1))));
      body.append(
        "items[0][note]",
        (areaSqm
          ? `${number(areaSqm)} m² incl. waste, from the visualizer estimate. `
          : "Area to be confirmed. ") + designNote,
      );
    }

    const notes = [value("message"), shareUrl ? `Visualisation: ${shareUrl}` : null]
      .filter(Boolean)
      .join("\n\n");
    if (notes) body.append("notes", notes.slice(0, 2000));
    if (shareUrl) body.append("attribution[visualization_url]", shareUrl.slice(0, 200));
    body.append("attribution[tool]", "room-visualizer");

    const image = await render().catch(() => null);
    if (image) body.append("attachments[0]", image, "room-visualisation.jpg");

    setIsSending(true);
    setErrors({});

    try {
      const response = await fetch("/api/leads", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as {
        reference?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !payload.reference) {
        setErrors(fieldErrors(payload.errors));
        toast.error(payload.message ?? "We could not send that. Please check the form.");
        return;
      }

      setReference(payload.reference);
      track("lead_submitted", { kind, product: material.productSlug, has_area: areaSqm !== null });
    } catch {
      toast.error("We could not send that just now. Please try again, or message us on WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setReference(null);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        {reference ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold" aria-hidden />
            <DialogTitle className="mt-4 font-display text-xl">
              {kind === "sample" ? "Sample ordered" : "Quote requested"}
            </DialogTitle>
            <DialogDescription className="mt-2">
              Your reference is <strong className="font-mono text-foreground">{reference}</strong>.
              A consultant will be in touch within one working day.
            </DialogDescription>
            <Button className="mt-6 h-11 w-full" onClick={() => onOpenChange(false)}>
              Back to my room
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>

            {material && (
              <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <span className="font-semibold">{material.productName}</span>
                {material.variantName && (
                  <span className="text-muted-foreground"> — {material.variantName}</span>
                )}
                {kind === "quote" && areaSqm !== null && (
                  <span className="block text-xs text-muted-foreground">
                    About {number(areaSqm)} m² including waste
                  </span>
                )}
              </p>
            )}

            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(event.currentTarget);
              }}
            >
              <Field
                label="Full name"
                name="name"
                autoComplete="name"
                required
                error={errors.full_name}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Phone / WhatsApp"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  error={errors.phone}
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  error={errors.email}
                />
              </div>
              {kind === "sample" && (
                <Field
                  label="Delivery address"
                  name="address"
                  autoComplete="street-address"
                  required
                  error={errors.address_line}
                />
              )}
              <Field label="City" name="city" autoComplete="address-level2" error={errors.city} />

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Anything else? (optional)
                </span>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={1500}
                  className={cn(control, "py-2")}
                  placeholder={
                    kind === "sample"
                      ? "Other colours you would like to see…"
                      : "Rooms, timing, installation…"
                  }
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="consent" required className="mt-0.5 accent-gold" />
                <span>
                  I agree to Floor Nigeria contacting me about this request. Enter a phone number or
                  an email so we can reach you.
                </span>
              </label>
              {errors.consent_given && (
                <p className="text-xs text-destructive">{errors.consent_given}</p>
              )}

              <Button type="submit" className="mt-1 h-11 w-full" disabled={isSending || !material}>
                {isSending && <Loader2 className="animate-spin" aria-hidden />}
                {copy.submit}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const control =
  "mt-1 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

function Field({
  label,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input {...rest} aria-invalid={error ? true : undefined} className={cn(control, "h-10")} />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/** Laravel's `contact.email` errors, keyed by the last segment for the form. */
function fieldErrors(errors?: Record<string, string[]>): Record<string, string> {
  if (!errors) return {};

  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [
      key.split(".").pop() ?? key,
      messages[0] ?? "",
    ]),
  );
}
