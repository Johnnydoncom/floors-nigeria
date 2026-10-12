import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BranchLocator } from "@/components/branches/BranchLocator";
import { JsonLd } from "@/components/site/JsonLd";
import {
  BRANCHES,
  HEAD_OFFICE,
  NETWORK_STATS,
  PUBLISHED_BRANCHES,
  directionsUrl,
  formatPhone,
  mapEmbedUrl,
} from "@/lib/branches";
import { whatsAppLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { WHATSAPP_NUMBER } from "@/lib/site-contact";
import { branchSchema, breadcrumbSchema, itemListSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Branches & Showrooms",
  description: `Visit Floor Nigeria at ${NETWORK_STATS.locations} locations — head office in Ikeja, showrooms across Lagos, Abuja, Ibadan, Enugu, Owerri, Aba, Port Harcourt, Warri and Uyo, plus Accra, Lomé and Cotonou. Addresses, phone lines and directions.`,
  path: "/branches",
  keywords: [
    "flooring showroom Lagos",
    "flooring shop Abuja",
    "flooring store Port Harcourt",
    "flooring Enugu",
    "Floor Nigeria branches",
    "flooring Ghana",
  ],
});

/** Every place we trade from, for the ticker: "Ikeja", "Isolo", "Port Harcourt"… */
const PLACES = BRANCHES.map((branch) =>
  branch.kind === "head-office" ? branch.area : branch.name.replace(/ Warehouse$/, ""),
);

const STATS = [
  { value: NETWORK_STATS.locations, label: "Locations", note: "Showrooms, offices & warehouses" },
  { value: NETWORK_STATS.cities, label: "Cities", note: "From Accra to Uyo" },
  { value: NETWORK_STATS.states, label: "States + FCT", note: "Across Nigeria" },
  { value: NETWORK_STATS.countries, label: "Countries", note: "Nigeria, Ghana, Togo, Benin" },
];

export default function BranchesPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Branches", url: "/branches" },
          ]),
          itemListSchema(
            PUBLISHED_BRANCHES.map((branch) => ({
              name: branch.name,
              url: `/branches/${branch.slug}`,
            })),
          ),
          ...PUBLISHED_BRANCHES.map(branchSchema),
        ]}
      />

      {/* Hero */}
      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow">Branches &amp; showrooms</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
              Visit a Floor Nigeria showroom near you.
            </h1>
          </div>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty lg:col-span-4">
            From our head office in Ikeja to showrooms across Nigeria — and in Accra, Lomé and
            Cotonou. See floors in person, get a quote, and arrange delivery from the branch closest
            to your site.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 border-y border-border lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={
                "py-6 pr-4 sm:py-8 " +
                (index % 2 === 1 ? "border-l border-border pl-5 sm:pl-8 " : "") +
                (index === 2 ? "lg:border-l lg:pl-8 " : "") +
                (index >= 2 ? "border-t border-border lg:border-t-0" : "")
              }
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-mono text-5xl tracking-tight md:text-6xl">
                  {String(stat.value).padStart(2, "0")}
                </span>
                <span className="mt-3 block font-display text-sm font-semibold">{stat.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{stat.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Every place we trade, moving slowly past. Decorative: the list below is the content. */}
      <div aria-hidden className="relative mt-10 overflow-hidden py-4">
        <div className="city-marquee flex w-max">
          {[0, 1].map((run) => (
            <div key={run} className="flex shrink-0 items-center">
              {PLACES.map((place) => (
                <span
                  key={`${run}-${place}`}
                  className="flex items-center font-display text-4xl font-semibold tracking-tight whitespace-nowrap text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--foreground)_20%,transparent)] md:text-6xl"
                >
                  {place}
                  <span className="mx-6 h-2 w-2 rounded-full bg-gold md:mx-10" />
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background md:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background md:w-40" />
      </div>

      {/* Head office */}
      <section
        aria-labelledby="head-office"
        className="mt-10 bg-charcoal-dark py-16 text-primary-foreground md:py-24"
      >
        <div className="container-fluid grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow text-gold-light">Head office</p>
            <h2
              id="head-office"
              className="mt-4 font-display text-3xl tracking-tight text-balance md:text-5xl"
            >
              Ikeja, Lagos
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/60 text-pretty">
              Our corporate office. Speak to the head office about trade accounts, large projects
              and enquiries that span more than one branch.
            </p>

            <address className="mt-10 grid gap-6 not-italic sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/50">
                  <MapPin className="h-3.5 w-3.5 text-gold-light" aria-hidden /> Address
                </p>
                <p className="mt-2 leading-relaxed">
                  {HEAD_OFFICE.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/50">
                  <Phone className="h-3.5 w-3.5 text-gold-light" aria-hidden /> Call
                </p>
                <p className="mt-2 space-y-1">
                  {HEAD_OFFICE.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="block font-mono transition hover:text-gold-light"
                    >
                      {formatPhone(phone)}
                    </a>
                  ))}
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/50">
                  <Mail className="h-3.5 w-3.5 text-gold-light" aria-hidden /> Email
                </p>
                <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {HEAD_OFFICE.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="break-all transition hover:text-gold-light"
                    >
                      {email}
                    </a>
                  ))}
                </p>
              </div>
            </address>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={directionsUrl(HEAD_OFFICE)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold"
              >
                Get directions <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
              <a href={`tel:${HEAD_OFFICE.phones[0]}`} className="btn btn-outline-light">
                <Phone className="h-4 w-4" aria-hidden /> Call head office
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <iframe
                src={mapEmbedUrl(HEAD_OFFICE)}
                title="Map: Floor Nigeria head office, 42 Olowu Street, Ikeja"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block aspect-[4/3] w-full grayscale-[0.85] md:aspect-[16/11]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Locator */}
      <section
        id="locator"
        aria-labelledby="locator-heading"
        className="scroll-mt-28 py-16 md:py-24"
      >
        <div className="container-fluid">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Branch locator</p>
              <h2
                id="locator-heading"
                className="mt-3 font-display text-3xl tracking-tight md:text-5xl"
              >
                Find your nearest branch
              </h2>
            </div>
            <p className="max-w-md text-muted-foreground text-pretty">
              Search by city or street, filter by region, or pick a city on the map. Every card has
              a direct line and directions.
            </p>
          </div>

          <BranchLocator />
        </div>
      </section>

      {/* No branch nearby */}
      <section className="container-fluid pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-2xl bg-surface px-6 py-12 md:px-14 md:py-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="eyebrow">Outside our cities?</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-balance md:text-4xl">
                We deliver and install nationwide.
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground text-pretty">
                Send us your floor plan or room sizes and we&apos;ll cost the job, then arrange
                delivery and installation from the nearest branch.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
              <a
                href={whatsAppLink(
                  WHATSAPP_NUMBER,
                  "Hello Floor Nigeria, which branch is closest to me? I would like a flooring quote.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp
              </a>
              <Link href="/contact#enquiry" className="btn btn-outline">
                Book a consultation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
