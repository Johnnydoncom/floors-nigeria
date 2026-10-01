import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Ruler,
  ShieldCheck,
  Award,
  Truck,
  Quote,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { HeroSlider } from "@/components/site/HeroSlider";
import { JsonLd } from "@/components/site/JsonLd";
import { getCategories, getProducts } from "@/lib/api/catalog";
import { FloorCard } from "@/components/catalog/FloorCard";
import { resolveFloorFamilies } from "@/lib/floor-families";
import { PROJECTS } from "@/lib/content/projects";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import {
  DEFAULT_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  pageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: SEO_KEYWORDS,
  }),
  // The homepage title is the brand line itself, not "<page> — Floors NG".
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
};

const spcImg = "/images/collection-spc.jpg";
const hotelImg = "/images/project-hotel.jpg";
const officeImg = "/images/project-office.jpg";
const residenceImg = "/images/project-residence.jpg";
const aiImg = "/images/ai-visualizer.jpg";

const promises = [
  { icon: Truck, title: "Nationwide delivery", note: "Free above ₦500,000" },
  { icon: ShieldCheck, title: "Up to 25-year warranty", note: "Residential & commercial" },
  { icon: Award, title: "European sourcing", note: "Italy · Belgium · Germany" },
  { icon: Ruler, title: "Certified installers", note: "5-year workmanship cover" },
];

/** How many floor families the "Shop by floor" grid shows. */
const HOME_FLOORS = 6;

const rooms = [
  {
    name: "Living rooms",
    slug: "living-room",
    img: residenceImg,
    note: "Laminate, wood and carpet",
  },
  { name: "Kitchens & baths", slug: "kitchen", img: spcImg, note: "100% waterproof SPC" },
  { name: "Offices & lobbies", slug: "office", img: officeImg, note: "Carpet tiles and SPC" },
  { name: "Hotels & lounges", slug: "hotel", img: hotelImg, note: "Broadloom and wall panels" },
];

const tools = [
  {
    icon: Sparkles,
    title: "AI Room Visualizer",
    desc: "See a floor in your own room in seconds",
    href: "/visualizer",
  },
  {
    icon: Ruler,
    title: "Floor Calculator",
    desc: "Quantities, wastage and installation cost",
    href: "/calculator",
  },
  {
    icon: Award,
    title: "Talk to a specifier",
    desc: "Free consultation, nationwide",
    href: "/contact",
  },
];

const testimonials = [
  {
    q: "They specified, supplied and installed 12,800 m² without a single day of programme slip.",
    n: "Tunde Ajayi",
    r: "Project Director, Access Facilities",
  },
  {
    q: "The AI visualiser sold the scheme to our client in one meeting. Extraordinary tool.",
    n: "Ifeoma Nwosu",
    r: "Principal, Bricklane Studio",
  },
  {
    q: "Three years of heavy hotel footfall and the oak still looks like week one.",
    n: "Grace Etim",
    r: "GM, Lagoon Hotels",
  },
];

const stats = [
  ["1.4M", "m² installed"],
  ["12", "Years of craft"],
  ["36", "Global suppliers"],
  ["98%", "On-time delivery"],
];

export default function Home() {
  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      <HeroSlider />

      {/* INTRO — the page's one h1, rendered on the server so it never
          changes with the carousel. */}
      <section className="border-b border-border">
        <div className="container-fluid grid gap-8 py-16 md:py-20 lg:grid-cols-12 lg:items-end lg:gap-12">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">Floors NG · Lagos, Abuja &amp; nationwide</p>
            <h1 className="mt-4 font-display text-3xl tracking-tight text-balance md:text-5xl md:leading-[1.08]">
              Premium flooring, supplied and installed across Nigeria.
            </h1>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              SPC and luxury vinyl, engineered wood, natural stone, epoxy, artificial grass and wall
              panels — specified by our team, delivered to site and laid by our own crews.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary">
                Shop all flooring <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/contact" className="btn btn-outline">
                Book a free consultation
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="container-fluid">
          <ul className="grid grid-cols-2 gap-x-2 sm:gap-x-6 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {promises.map((item) => (
              <li key={item.title} className="flex items-center gap-3 py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-gold">
                  <item.icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{item.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SHOP BY MATERIAL */}
      <section className="container-fluid py-20 md:py-28">
        <SectionHeading
          eyebrow="Shop by floor"
          title="Every floor we supply, laid by our own crews."
          link={{ href: "/categories", label: "All categories" }}
        />

        <Suspense fallback={<FloorGridSkeleton />}>
          <FloorGrid />
        </Suspense>
      </section>

      {/* BESTSELLERS */}
      <section className="border-y border-border bg-surface py-20 md:py-28">
        <div className="container-fluid">
          <SectionHeading
            eyebrow="Bestsellers"
            title="Specified most often this quarter."
            link={{ href: "/products", label: "Shop all flooring" }}
          />

          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <BestsellerGrid />
          </Suspense>
        </div>
      </section>

      {/* SHOP BY ROOM */}
      <section className="container-fluid py-20 md:py-28">
        <SectionHeading eyebrow="Shop by space" title="The right floor for the room it lives in." />
        <div className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.map((r, i) => (
            <Reveal key={r.name} delay={(i % 4) * 0.06}>
              <Link href={`/rooms/${r.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={r.img}
                    alt={`${r.name} flooring`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg tracking-tight">{r.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.note}</p>
                  </div>
                  <ArrowUpRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-gold"
                    aria-hidden
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI STUDIO + TOOLS */}
      <section className="bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid grid items-center gap-12 py-20 md:py-28 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-gold-light">Free planning tools</p>
            <h2 className="mt-4 font-display text-3xl tracking-tight text-balance md:text-5xl">
              Plan the floor before you lay a single plank.
            </h2>
            <p className="mt-5 max-w-md text-primary-foreground/65">
              Photoreal room previews, square-metre calculators with wastage, and a specifier on
              call — every tool free to use.
            </p>
            <div className="mt-9 space-y-3">
              {tools.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group flex items-center gap-4 rounded-lg border border-white/10 p-4 transition hover:border-gold/50 hover:bg-white/[0.04]"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-light">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold">{f.title}</div>
                    <div className="text-sm text-primary-foreground/55">{f.desc}</div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-primary-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-gold-light"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-xl shadow-elevated">
              <div className="relative aspect-[5/4] w-full">
                <Image
                  src={aiImg}
                  alt="Room visualizer previewing a timber floor"
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-charcoal-dark/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                preview
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROJECTS + STATS */}
      <section className="container-fluid py-20 md:py-28">
        <SectionHeading
          eyebrow="Reference projects"
          title="Delivered across Nigeria."
          link={{ href: "/projects", label: "All projects" }}
        />

        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {stats.map(([n, l]) => (
            <div key={l} className="flex flex-col-reverse bg-background p-5 md:p-7">
              <dt className="mt-1 text-sm text-muted-foreground">{l}</dt>
              <dd className="font-display text-3xl tracking-tight md:text-4xl">{n}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-x-5 gap-y-8 md:grid-cols-3">
          {PROJECTS.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08}>
              <Link href={`/projects/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={p.image}
                    alt={`${p.name}, ${p.location}`}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {p.sector} · {p.area}
                  </p>
                  <h3 className="mt-1 font-display text-xl tracking-tight transition group-hover:text-gold md:text-2xl">
                    {p.name}
                  </h3>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-border bg-surface py-20 md:py-28">
        <div className="container-fluid">
          <SectionHeading eyebrow="Client word" title="Trusted by the people who build Nigeria." />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.n} delay={i * 0.08}>
                <figure className="flex h-full flex-col rounded-lg border border-border bg-background p-7">
                  <Quote className="h-6 w-6 text-gold" aria-hidden />
                  <blockquote className="mt-5 font-display text-lg leading-snug tracking-tight md:text-xl">
                    &ldquo;{t.q}&rdquo;
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 pt-6 text-sm">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-charcoal font-display text-xs font-semibold text-primary-foreground"
                      aria-hidden
                    >
                      {t.n
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <span>
                      <span className="block font-semibold">{t.n}</span>
                      <span className="block text-xs text-muted-foreground">{t.r}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRADE CTA */}
      <section className="container-fluid py-20 md:py-28">
        <Reveal>
          <div className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-2">
            <div className="bg-charcoal-dark p-10 text-primary-foreground md:p-14">
              <p className="eyebrow text-gold-light">For specifiers</p>
              <h2 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
                Open a trade account.
              </h2>
              <p className="mt-4 max-w-md text-primary-foreground/65">
                Project pricing, free sample boxes, BIM files and a dedicated account manager for
                architects, contractors and developers.
              </p>
              <Link href="/contact?enquiry=trade" className="btn btn-gold mt-8">
                Apply now <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="bg-surface p-10 md:p-14">
              <p className="eyebrow">Samples</p>
              <h2 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
                Feel it before you buy.
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Order up to five samples for ₦2,500 each — fully refunded against your first order
                above 50 m².
              </p>
              <Link href="/contact?enquiry=samples" className="btn btn-primary mt-8">
                Order samples
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl tracking-tight text-balance md:text-[2.75rem] md:leading-[1.1]">
          {title}
        </h2>
      </div>
      {link && (
        <Link
          href={link.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition hover:text-gold"
        >
          {link.label}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </Reveal>
  );
}

/**
 * The headline floor families, from the live category tree so every tile
 * opens a real category page with that category's own photograph.
 */
async function FloorGrid() {
  const floors = resolveFloorFamilies(await getCategories().catch(() => [])).slice(0, HOME_FLOORS);

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
      {floors.map((floor, i) => (
        <Reveal key={floor.slug} delay={(i % 3) * 0.06}>
          <FloorCard
            href={floor.href}
            name={floor.name}
            tagline={floor.tagline}
            image={floor.image}
          />
        </Reveal>
      ))}
    </div>
  );
}

function FloorGridSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
      {Array.from({ length: HOME_FLOORS }, (_, i) => (
        <div key={i} className="aspect-[5/4] animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

/**
 * Bestsellers stream in from the catalogue API, so the hero and the rest of
 * the page render immediately (§19, §28).
 */
async function BestsellerGrid() {
  // Prefer products the team has flagged as featured; until any are, show the
  // most popular so the section is never an empty band.
  let { data: products } = await getProducts({ featured: true, sort: "popular", per_page: 4 });
  if (products.length === 0) {
    ({ data: products } = await getProducts({ sort: "popular", per_page: 4 }));
  }

  if (products.length === 0) {
    return (
      <p className="mt-10 rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
        Our bestsellers are on their way.{" "}
        <Link href="/products" className="underline underline-offset-4 hover:text-gold">
          Browse the full range
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mt-10 grid gap-2 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
