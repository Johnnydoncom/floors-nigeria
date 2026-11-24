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
  Compass,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { HeroRoomTeaser } from "@/components/site/HeroRoomTeaser";
import { ShoppingSteps } from "@/components/catalog/ShoppingSteps";
import { floorChoices } from "@/lib/room/materials";
import type { TextureChoice } from "@/lib/visualizer/types";
import { JsonLd } from "@/components/site/JsonLd";
import { getCategories, getProducts } from "@/lib/api/catalog";
import { FloorCard } from "@/components/catalog/FloorCard";
import { resolveFloorFamilies } from "@/lib/floor-families";
import { getPortfolio } from "@/lib/api/content";
import { ProjectCard } from "@/components/content/ProjectCard";
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
    icon: Compass,
    title: "Find My Floor",
    desc: "Five taps to the three floors that suit your space",
    href: "/floor-finder",
  },
  {
    icon: Sparkles,
    title: "Room Visualizer",
    desc: "Any floor, any wall colour, in your own room — in seconds",
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

      {/* HERO — the page's one h1, and the room the visualizer opens on. */}
      <section className="overflow-hidden border-b border-border bg-surface/40 pt-header">
        <div className="container-fluid grid items-center gap-10 py-10 md:py-12 lg:grid-cols-12 lg:gap-14 lg:py-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">Floors NG · Lagos, Abuja &amp; nationwide</p>
            <h1 className="mt-4 text-balance font-display text-4xl tracking-tight md:text-5xl md:leading-[1.05] xl:text-[3.4rem]">
              Premium flooring, supplied and installed across Nigeria.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              SPC and luxury vinyl, engineered wood, natural stone, epoxy, artificial grass and wall
              panels — see them in your own room, then let our crews lay them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary">
                Shop all flooring <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/visualizer" className="btn btn-outline">
                <Sparkles className="h-4 w-4" aria-hidden /> See it in your room
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
              {stats.slice(0, 3).map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-display text-2xl tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-7">
            <Suspense fallback={<HeroRoomTeaser floors={[]} />}>
              <HeroTeaser />
            </Suspense>
          </div>
        </div>
      </section>

      {/* PROMISES + HOW BUYING WORKS */}
      <section className="container-fluid space-y-8 py-10 md:py-14">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
          {promises.map((item) => (
            <li key={item.title} className="flex items-center gap-3 py-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
                <item.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <ShoppingSteps />
      </section>

      {/* SHOP BY MATERIAL */}
      <section className="container-fluid pb-20 pt-6 md:pb-28">
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

      {/* PLANNING TOOLS */}
      <section className="border-y border-border bg-surface/60 py-20 md:py-28">
        <div className="container-fluid grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">Free planning tools</p>
            <h2 className="mt-3 text-balance font-display text-3xl tracking-tight md:text-[2.75rem] md:leading-[1.1]">
              Plan the floor before you lay a single plank.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Photoreal room previews, wall colours, square-metre calculators with wastage, and a
              specifier on call — every tool free to use.
            </p>
            <Link href="/visualizer" className="btn btn-primary mt-8">
              Open the visualizer <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {tools.map((tool, i) => (
              <Reveal key={tool.title} delay={i * 0.06}>
                <Link
                  href={tool.href}
                  className="group flex h-full flex-col rounded-xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-luxe"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold">
                    <tool.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="mt-4 flex items-center gap-1.5 font-display text-lg font-semibold tracking-tight">
                    {tool.title}
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">{tool.desc}</span>
                </Link>
              </Reveal>
            ))}
          </div>
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

        <Suspense fallback={<ProjectGridSkeleton />}>
          <ProjectGrid />
        </Suspense>
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
              <p className="eyebrow text-gold-light">For specifiers &amp; contractors</p>
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

/**
 * Featured portfolio projects from the CMS, falling back to the most recent.
 */
async function ProjectGrid() {
  let projects = await getPortfolio({ featured: true, limit: 3 });
  if (projects.length === 0) projects = await getPortfolio({ limit: 3 });

  if (projects.length === 0) return null;

  return (
    <div className="mt-8 grid gap-x-5 gap-y-8 md:grid-cols-3">
      {projects.map((project, i) => (
        <Reveal key={project.id} delay={i * 0.08}>
          <ProjectCard project={project} />
        </Reveal>
      ))}
    </div>
  );
}

function ProjectGridSkeleton() {
  return (
    <div className="mt-8 grid gap-x-5 gap-y-8 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
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

/**
 * Floors for the hero's room: the most popular, one colour each, so the four
 * swatches are four different floors.
 */
async function HeroTeaser() {
  const { data } = await getProducts({ sort: "popular", per_page: 12 });
  const seen = new Set<string>();
  const floors: TextureChoice[] = [];
  for (const choice of floorChoices(data)) {
    if (seen.has(choice.productSlug)) continue;
    seen.add(choice.productSlug);
    floors.push(choice);
    if (floors.length === 4) break;
  }
  return <HeroRoomTeaser floors={floors} />;
}
