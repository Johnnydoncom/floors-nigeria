import Link from "next/link";
import { Instagram, Linkedin, Youtube, Phone, Mail, MapPin } from "lucide-react";
import { SampleRequestForm } from "./SampleRequestForm";
import { Logo } from "./Logo";
import { getNavigation } from "@/lib/api/navigation";
import { SHOWROOM_EMAIL, SHOWROOM_PHONE } from "@/lib/site-contact";

/**
 * Evaluated once when the server module loads, so the copyright line never
 * forces the layout out of the prerendered shell.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Static columns. The products column is built from the live catalogue in
 * {@link Footer} so it never drifts from what is actually for sale.
 */
const cols = [
  {
    title: "Solutions",
    links: [
      ["Residential", "/industries"],
      ["Commercial", "/industries"],
      ["Hospitality", "/industries"],
      ["Healthcare", "/industries"],
      ["Education", "/industries"],
      ["Retail", "/industries"],
    ],
  },
  {
    title: "Studio",
    links: [
      ["AI Room Visualizer", "/visualizer"],
      ["Floor Calculator", "/calculator"],
      ["AI Design Assistant", "/visualizer"],
      ["Downloads", "/blog"],
      ["Journal", "/blog"],
      ["Projects", "/projects"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Careers", "/about"],
      ["Privacy", "/about"],
      ["Terms", "/about"],
      ["FAQs", "/about"],
    ],
  },
];

export async function Footer() {
  // A catalogue outage should not take the footer down with it.
  const categories = await getNavigation()
    .then((navigation) => navigation.categories)
    .catch(() => []);

  const columns = [
    {
      title: "Shop Flooring",
      links: categories
        .slice(0, 6)
        .map((category): [string, string] => [category.name, `/categories/${category.slug}`]),
    },
    ...cols,
  ];

  const socials = [
    { label: "Instagram", icon: Instagram },
    { label: "LinkedIn", icon: Linkedin },
    { label: "YouTube", icon: Youtube },
  ];

  return (
    <footer className="bg-charcoal-dark text-primary-foreground">
      {/* Sample request band */}
      <div className="border-b border-white/10">
        <div className="container-fluid grid gap-6 py-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="eyebrow text-gold-light">Samples &amp; datasheets</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Specifying a floor? Start with samples.
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/60">
              Technical datasheets, BIM files and free swatches delivered nationwide.
            </p>
          </div>
          <SampleRequestForm className="lg:col-span-6 lg:col-start-7" />
        </div>
      </div>

      <div className="container-fluid py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <Link href="/" aria-label="Floor Nigeria home" className="inline-block">
              <Logo invert className="h-9 w-auto" />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/60 text-pretty">
              Nigeria&apos;s premium flooring house — engineered surfaces, natural stone, luxury
              vinyl and architectural finishes for the country&apos;s most demanding residential and
              commercial spaces.
            </p>
            <address className="space-y-2.5 text-sm not-italic text-primary-foreground/70">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <span>Showroom: Admiralty Way, Lekki Phase 1, Lagos</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <a href={`tel:${SHOWROOM_PHONE}`} className="transition hover:text-gold-light">
                  {SHOWROOM_PHONE}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <a href={`mailto:${SHOWROOM_EMAIL}`} className="transition hover:text-gold-light">
                  {SHOWROOM_EMAIL}
                </a>
              </p>
            </address>
            <div className="flex items-center gap-2">
              {socials.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-gold hover:bg-gold hover:text-charcoal-dark"
                  aria-label={label}
                  href="#"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-8"
          >
            {columns.map((c) => (
              <div key={c.title}>
                <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                  {c.title}
                </h3>
                <ul className="space-y-2.5">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href as string}
                        className="text-sm text-primary-foreground/60 transition hover:text-gold-light"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center">
          <p className="text-xs text-primary-foreground/50">
            © {COPYRIGHT_YEAR} Floors Nigeria Limited · RC 1234567
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-primary-foreground/50">
            <li>ISO 9001 Certified</li>
            <li>FSC® Sourced Timber</li>
            <li>25-Year Warranty</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
