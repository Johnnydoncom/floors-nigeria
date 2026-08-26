"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { toast } from "sonner";
import type { InputHTMLAttributes } from "react";

const locations = [
  {
    city: "Lagos · Flagship",
    addr: "12 Adeola Odeku Street, Victoria Island",
    tel: "+234 700 356 6767",
  },
  { city: "Abuja", addr: "Plot 421, Aminu Kano Crescent, Wuse II", tel: "+234 700 356 6720" },
  { city: "Port Harcourt", addr: "24 Aba Road, GRA Phase 2", tel: "+234 700 356 6730" },
];

function Input({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        className="mt-2 h-12 w-full rounded-xl bg-background border border-border px-4 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
      />
    </label>
  );
}

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <section className="pt-header md:pt-[calc(var(--header-height)+2rem)] container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Contact</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            Book a consultation.
            <br /> Leave with a costed proposal.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid py-16 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success("Thanks — a specifier will reach out within 24 hours.");
            }}
            className="rounded-3xl border border-border bg-surface p-8 md:p-10 space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <Input label="Full name" placeholder="Adaora Nwosu" />
              <Input label="Email" type="email" placeholder="you@company.com" />
              <Input label="Phone" placeholder="+234 800 000 0000" />
              <Input label="Company / Firm" placeholder="Cobalt Partners" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Project type
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Residential", "Commercial", "Hospitality", "Healthcare", "Retail", "Other"].map(
                  (t, i) => (
                    <button
                      type="button"
                      key={t}
                      className={`h-10 px-4 rounded-full text-sm border transition ${i === 0 ? "bg-charcoal text-primary-foreground border-charcoal" : "border-border hover:border-foreground/40"}`}
                    >
                      {t}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Message
              </label>
              <textarea
                rows={5}
                placeholder="Tell us about the project — location, area, timeline…"
                className="mt-2 w-full rounded-2xl bg-background border border-border p-4 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
              />
            </div>
            <button
              type="submit"
              className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-full bg-charcoal text-primary-foreground text-sm font-medium hover:bg-charcoal-dark transition"
            >
              {sent ? (
                <>
                  <Check className="h-4 w-4" /> Message sent
                </>
              ) : (
                <>
                  Send enquiry <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {locations.map((l) => (
            <Reveal key={l.city}>
              <div className="rounded-3xl border border-border p-6 hover:border-gold/40 transition">
                <div className="font-mono text-[11px] uppercase tracking-widest text-gold">
                  {l.city}
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />{" "}
                    <span>{l.addr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />{" "}
                    <span className="font-mono">{l.tel}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
          <div className="rounded-3xl bg-charcoal-dark text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gold-light" /> Mon–Sat · 09:00–18:00 WAT
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gold-light" /> hello@floorsng.com
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
