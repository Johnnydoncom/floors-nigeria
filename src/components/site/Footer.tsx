import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import WhatsAppIcon from "@/components/catalog/WhatsAppIcon";
import { SampleRequestForm } from "./SampleRequestForm";
import { Logo } from "./Logo";
import { getNavigation } from "@/lib/api/navigation";
import { getPages } from "@/lib/api/content";
import { HEAD_OFFICE, HUBS, NETWORK_STATS, formatPhone } from "@/lib/branches";
import { whatsAppLink } from "@/lib/format";
import {
  COMPANY_RC,
  SHOWROOM_EMAIL,
  SHOWROOM_PHONE,
  SOCIAL_LINKS,
  WHATSAPP_NUMBER,
} from "@/lib/site-contact";

/**
 * Evaluated once when the server module loads, so the copyright line never
 * forces the layout out of the prerendered shell.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

type Column = { title: string; links: [label: string, href: string][] };

/**
 * Static columns. The products column is built from the live catalogue in
 * {@link Footer} so it never drifts from what is actually for sale.
 */
const COLUMNS: Column[] = [
  {
    title: "Plan your floor",
    links: [
      ["Find My Floor", "/floor-finder"],
      ["Room Visualizer", "/visualizer"],
      ["Room Designer", "/room-designer"],
      ["Floor Calculator", "/calculator"],
      ["Order samples", "/contact?enquiry=samples"],
      ["Buying guides", "/blog"],
    ],
  },
  {
    title: "Who we floor",
    links: [
      ["Homes", "/industries#residential"],
      ["Offices", "/industries#commercial"],
      ["Hotels", "/industries#hospitality"],
      ["Hospitals", "/industries#healthcare"],
      ["Schools", "/industries#education"],
      ["Shops", "/industries#retail"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", "/about"],
      ["Branches & showrooms", "/branches"],
      ["Projects", "/projects"],
      ["Trade accounts", "/contact?enquiry=trade"],
      ["Contact", "/contact"],
    ],
  },
];

/** Pages shown in the bottom bar rather than a column. */
const LEGAL_SLUGS = new Set(["terms", "privacy-policy", "cookie-policy", "returns"]);

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  Instagram,
  Facebook,
  LinkedIn: Linkedin,
  YouTube: Youtube,
};

export async function Footer() {
  // A catalogue outage should not take the footer down with it.
  const [floors, pages] = await Promise.all([
    getNavigation()
      .then((navigation) => navigation.floors)
      .catch(() => []),
    getPages().catch(() => []),
  ]);
  const footerPages = pages.filter((page) => page.show_in_footer);
  const legalPages = footerPages.filter((page) => LEGAL_SLUGS.has(page.slug));

  const columns: Column[] = [
    {
      title: "Shop flooring",
      links: [
        ...floors.slice(0, 7).map((floor): [string, string] => [floor.name, floor.href]),
        ["All categories", "/categories"],
      ],
    },
    ...COLUMNS.map((column) =>
      column.title === "Company"
        ? {
            ...column,
            // Help pages editors flag for the footer (FAQs, delivery…), except
            // legal pages, which sit in the bottom bar.
            links: [
              ...column.links,
              ...footerPages
                .filter((page) => !LEGAL_SLUGS.has(page.slug))
                .map((page): [string, string] => [page.title, `/${page.slug}`]),
            ],
          }
        : column,
    ),
  ];

  const help = [
    {
      title: "Chat on WhatsApp",
      note: "Prices, stock and delivery",
      href: whatsAppLink(WHATSAPP_NUMBER, "Hello Floor Nigeria, I would like a flooring quote."),
      external: true,
      icon: <WhatsAppIcon className="h-5 w-5" />,
    },
    {
      title: `Call ${formatPhone(SHOWROOM_PHONE)}`,
      note: "Talk to a flooring specialist",
      href: `tel:${SHOWROOM_PHONE}`,
      external: false,
      icon: <Phone className="h-5 w-5" aria-hidden />,
    },
    {
      title: "Visit a showroom",
      note: `${NETWORK_STATS.branches} branches in ${HUBS.length} cities`,
      href: "/branches",
      external: false,
      icon: <MapPin className="h-5 w-5" aria-hidden />,
    },
  ];

  return (
    <footer className="bg-charcoal-dark text-primary-foreground">
      {/* Ways to reach a person, first: the footer is where people look for them. */}
      <div className="border-b border-white/10">
        <div className="container-fluid grid grid-cols-1 gap-8 py-10 lg:grid-cols-12 lg:items-center lg:py-12">
          <div className="lg:col-span-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Need help choosing a floor?
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/60">
              Our specialists answer every day. Or{" "}
              <Link
                href="/contact?enquiry=survey"
                className="text-gold-light underline-offset-4 hover:underline"
              >
                book a free site survey
              </Link>
              .
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-8">
            {help.map((item) => (
              <li key={item.title}>
                <a
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex h-full items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-gold/60 hover:bg-white/[0.06]"
                >
                  <span className="grid grid-cols-1 h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-light">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-primary-foreground/55">
                      {item.note}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-fluid pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-12 lg:pb-10 lg:pt-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Who we are, where, and the sample request. */}
          <div className="space-y-7 lg:col-span-4">
            <Link href="/" aria-label="Floor Nigeria home" className="inline-block">
              <Logo invert className="h-9 w-auto" />
            </Link>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-primary-foreground/60">
              Vinyl, SPC, laminate, wood, carpets, artificial grass and gym floors, supplied from
              our own warehouses and installed by our own crews across Nigeria.
            </p>
            <address className="space-y-2.5 text-sm not-italic text-primary-foreground/70">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <span>{HEAD_OFFICE.address.join(", ")}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <a href={`tel:${SHOWROOM_PHONE}`} className="transition hover:text-gold-light">
                  {formatPhone(SHOWROOM_PHONE)}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
                <a href={`mailto:${SHOWROOM_EMAIL}`} className="transition hover:text-gold-light">
                  {SHOWROOM_EMAIL}
                </a>
              </p>
            </address>

            <div className="max-w-md">
              <p className="mb-3 font-display text-sm font-semibold">Samples and datasheets</p>
              <SampleRequestForm />
            </div>

            {SOCIAL_LINKS.length > 0 && (
              <ul className="flex items-center gap-2" aria-label="Floor Nigeria on social media">
                {SOCIAL_LINKS.map(({ label, href }) => {
                  const Icon = SOCIAL_ICONS[label];
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="grid grid-cols-1 h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-gold hover:bg-gold hover:text-charcoal-dark"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <nav aria-label="Footer" className="lg:col-span-8">
            {/* Wide screens: every column open. */}
            <div className="hidden grid-cols-4 gap-8 lg:grid">
              {columns.map((column) => (
                <div key={column.title}>
                  <h3 className="mb-4 font-display text-sm font-semibold">{column.title}</h3>
                  <FooterLinks links={column.links} />
                </div>
              ))}
            </div>

            {/* Phones and tablets: one tap to open a column, so the page ends sooner. */}
            <div className="divide-y divide-white/10 border-y border-white/10 lg:hidden">
              {columns.map((column) => (
                <details key={column.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-display text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {column.title}
                    <ChevronDown
                      className="h-4 w-4 text-primary-foreground/60 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="pb-5">
                    <FooterLinks links={column.links} columns />
                  </div>
                </details>
              ))}
            </div>

            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-2 font-display text-sm font-semibold text-gold-light underline-offset-4 hover:underline lg:mt-10"
            >
              Browse the full catalogue <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-primary-foreground/50 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {COPYRIGHT_YEAR} Floors Nigeria Limited{COMPANY_RC ? `, RC ${COMPANY_RC}` : ""}. All
            rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalPages.map((page) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`} className="transition hover:text-gold-light">
                  {page.title}
                </Link>
              </li>
            ))}
            <li>ISO 9001 Certified</li>
            <li>FSC® Sourced Timber</li>
            <li>25-Year Warranty</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ links, columns = false }: { links: Column["links"]; columns?: boolean }) {
  return (
    <ul className={columns ? "grid grid-cols-2 gap-x-6 gap-y-3" : "space-y-2.5"}>
      {links.map(([label, href]) => (
        <li key={label}>
          <Link
            href={href}
            className="text-sm text-primary-foreground/60 transition hover:text-gold-light"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
