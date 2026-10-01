import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Suspense } from "react";
import { ContactForm, ContactFormFromQuery } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/site/JsonLd";
import { whatsAppLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { SHOWROOM_EMAIL, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { absoluteUrl, breadcrumbSchema, organizationSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Contact & Showrooms",
  description:
    "Book a free flooring consultation with Floor Nigeria. Visit our showrooms in Lagos, Abuja and Port Harcourt, call, or message us on WhatsApp for a costed proposal.",
  path: "/contact",
  keywords: ["flooring showroom Lagos", "flooring consultation", "flooring quote Nigeria"],
});

const locations = [
  {
    city: "Lagos · Flagship",
    addr: "12 Adeola Odeku Street, Victoria Island",
    tel: "+234 700 356 6767",
  },
  { city: "Abuja", addr: "Plot 421, Aminu Kano Crescent, Wuse II", tel: "+234 700 356 6720" },
  { city: "Port Harcourt", addr: "24 Aba Road, GRA Phase 2", tel: "+234 700 356 6730" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact Floor Nigeria",
            url: absoluteUrl("/contact"),
            about: organizationSchema(),
          },
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Contact", url: "/contact" },
          ]),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
          Book a consultation. Leave with a costed proposal.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Tell us about the space and a specifier will call within one working day — free site
          surveys across Lagos, and remote consultations nationwide.
        </p>
      </section>

      <section className="container-fluid grid gap-8 py-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Suspense fallback={<ContactForm />}>
            <ContactFormFromQuery />
          </Suspense>
        </div>

        <aside className="space-y-4 lg:col-span-5" aria-label="Showrooms and opening hours">
          <a
            href={whatsAppLink(
              WHATSAPP_NUMBER,
              "Hello Floor Nigeria, I would like a flooring quote.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-5 transition hover:border-[#25D366]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display font-semibold">Chat on WhatsApp</span>
              <span className="block text-sm text-muted-foreground">
                Fastest for prices and availability
              </span>
            </span>
          </a>

          {locations.map((l) => (
            <div
              key={l.city}
              className="rounded-xl border border-border p-6 transition hover:border-gold/40"
            >
              <h2 className="eyebrow">{l.city}</h2>
              <address className="mt-3 space-y-2 text-sm not-italic">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>{l.addr}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <a href={`tel:${l.tel.replace(/\s/g, "")}`} className="font-mono hover:text-gold">
                    {l.tel}
                  </a>
                </p>
              </address>
            </div>
          ))}

          <div className="rounded-xl bg-charcoal-dark p-6 text-primary-foreground">
            <p className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gold-light" aria-hidden /> Mon–Sat · 09:00–18:00 WAT
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gold-light" aria-hidden />
              <a href={`mailto:${SHOWROOM_EMAIL}`} className="hover:text-gold-light">
                {SHOWROOM_EMAIL}
              </a>
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
