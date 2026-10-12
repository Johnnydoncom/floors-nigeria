import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Suspense } from "react";
import { ContactForm, ContactFormFromQuery } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/site/JsonLd";
import { BRANCHES, HEAD_OFFICE, NETWORK_STATS, REGIONS, formatPhone } from "@/lib/branches";
import { whatsAppLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { SHOWROOM_EMAIL, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { absoluteUrl, breadcrumbSchema, organizationSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Contact & Showrooms",
  description:
    "Book a free flooring consultation with Floor Nigeria. Visit our head office in Ikeja or one of our branches across Nigeria, Ghana, Togo and Benin, call, or message us on WhatsApp for a costed proposal.",
  path: "/contact",
  keywords: ["flooring showroom Lagos", "flooring consultation", "flooring quote Nigeria"],
});

/** Walk-in branches per region, for the quick list beside the form. */
const regions = REGIONS.map((region) => ({
  ...region,
  branches: BRANCHES.filter(
    (branch) => branch.region === region.id && branch.kind === "showroom" && !branch.pending,
  ),
})).filter((region) => region.branches.length > 0);

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
        <div id="enquiry" className="scroll-mt-28 lg:col-span-7">
          <Suspense fallback={<ContactForm />}>
            <ContactFormFromQuery />
          </Suspense>
        </div>

        <aside
          id="showrooms"
          className="scroll-mt-28 space-y-4 lg:col-span-5"
          aria-label="Showrooms and opening hours"
        >
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

          <div className="rounded-xl border border-border p-6 transition hover:border-gold/40">
            <h2 className="eyebrow">Head office · {HEAD_OFFICE.area}</h2>
            <address className="mt-3 space-y-2 text-sm not-italic">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{HEAD_OFFICE.address.join(", ")}</span>
              </p>
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {HEAD_OFFICE.phones.map((phone) => (
                    <a key={phone} href={`tel:${phone}`} className="font-mono hover:text-gold">
                      {formatPhone(phone)}
                    </a>
                  ))}
                </span>
              </p>
            </address>
          </div>

          <div className="rounded-xl border border-border p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="eyebrow">Branches</h2>
              <span className="text-xs text-muted-foreground">
                {NETWORK_STATS.locations} locations · {NETWORK_STATS.countries} countries
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {regions.map((region) => (
                <div key={region.id} className="grid grid-cols-[6.5rem_1fr] gap-3">
                  <dt className="text-muted-foreground">{region.name}</dt>
                  <dd className="flex flex-wrap gap-x-3 gap-y-1">
                    {region.branches.map((branch) => (
                      <Link
                        key={branch.slug}
                        href={`/branches/${branch.slug}`}
                        className="underline decoration-border underline-offset-4 transition hover:text-gold hover:decoration-gold"
                      >
                        {branch.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href="/branches"
              className="mt-5 inline-flex items-center gap-1.5 font-display text-[13px] font-semibold transition hover:text-gold"
            >
              Find your nearest branch <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

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
