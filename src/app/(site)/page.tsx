import Image from "next/image";
import Link from "next/link";
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
import { naira } from "@/lib/format";
import { getProducts } from "@/lib/api/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { Suspense } from "react";

const oakImg = "/images/collection-oak.jpg";
const spcImg = "/images/collection-spc.jpg";
const stoneImg = "/images/collection-stone.jpg";
const hotelImg = "/images/project-hotel.jpg";
const officeImg = "/images/project-office.jpg";
const residenceImg = "/images/project-residence.jpg";
const aiImg = "/images/ai-visualizer.jpg";
const heroFloor = "/images/hero-floor.jpg";
const materialsStrip = "/images/materials-strip.jpg";

const materials = [
  { name: "Engineered Wood", img: oakImg, from: 18500 },
  { name: "SPC & Vinyl", img: spcImg, from: 7600 },
  { name: "Natural Stone", img: stoneImg, from: 27500 },
  { name: "Wall Panels", img: residenceImg, from: 21000 },
  { name: "Outdoor Decking", img: heroFloor, from: 15900 },
  { name: "Artificial Grass", img: materialsStrip, from: 6400 },
];

const rooms = [
  { name: "Living rooms", img: residenceImg, note: "Warm oak, wide plank" },
  { name: "Kitchens & baths", img: spcImg, note: "100% waterproof SPC" },
  { name: "Offices & lobbies", img: officeImg, note: "Heavy-traffic rated" },
  { name: "Hotels & lounges", img: hotelImg, note: "Acoustic + stone" },
];

const projects = [
  { name: "Radisson Blu Lagos", type: "Hospitality · 4,200 m²", img: hotelImg },
  { name: "Access Tower Ikoyi", type: "Commercial · 12,800 m²", img: officeImg },
  { name: "Banana Island Residence", type: "Residential · 620 m²", img: residenceImg },
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
      <div className="">
        <HeroSlider />
      </div>

      {/* TRUST BAR */}
      <section className="bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { icon: Truck, t: "Nationwide delivery", s: "Free above ₦500,000" },
            { icon: ShieldCheck, t: "Up to 25-yr warranty", s: "Residential & commercial" },
            { icon: Award, t: "European sourcing", s: "Italy · Belgium · Germany" },
            { icon: Ruler, t: "Certified installers", s: "5-yr workmanship cover" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3 px-4 py-6 first:pl-0">
              <f.icon className="h-5 w-5 shrink-0 text-gold-light" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{f.t}</div>
                <div className="truncate text-xs text-primary-foreground/60">{f.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOP BY MATERIAL */}
      <section className="container-fluid py-20 md:py-28">
        <Reveal className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
              01 · Shop by material
            </p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl tracking-tight text-balance">
              Six material families. One standard.
            </h2>
          </div>
          <Link
            href="/products"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-gold transition"
          >
            All products <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {materials.map((m, i) => (
            <Reveal key={m.name} delay={(i % 3) * 0.06}>
              <Link
                href="/products"
                className="group relative block aspect-[5/4] overflow-hidden bg-muted"
              >
                <Image
                  src={m.img}
                  alt={m.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark/80 via-charcoal-dark/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-primary-foreground">
                  <div className="font-display text-xl md:text-2xl tracking-tight">{m.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-primary-foreground/75">
                      FROM {naira(m.from)}/M²
                    </span>
                    <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition text-gold-light" />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="bg-surface py-20 md:py-28 border-y border-border">
        <div className="container-fluid">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
              02 · Bestsellers
            </p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl tracking-tight text-balance">
              Specified most often this quarter.
            </h2>
          </Reveal>

          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <BestsellerGrid />
          </Suspense>
        </div>
      </section>

      {/* SHOP BY ROOM */}
      <section className="container-fluid py-20 md:py-28">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
            03 · Shop by space
          </p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl tracking-tight text-balance">
            The right floor for the room it lives in.
          </h2>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((r, i) => (
            <Reveal key={r.name} delay={(i % 4) * 0.06}>
              <Link href="/industries" className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  <Image
                    src={r.img}
                    alt={r.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
                <div className="mt-4 border-t-2 border-charcoal-dark pt-3 group-hover:border-gold transition-colors">
                  <div className="font-display text-xl tracking-tight">{r.name}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {r.note}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI STUDIO + TOOLS */}
      <section className="bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid py-20 md:py-28 grid lg:grid-cols-12 gap-12 items-center">
          <Reveal className="lg:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-light">
              04 · Tools
            </p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl tracking-tight text-balance">
              Plan the floor before you lay a single plank.
            </h2>
            <p className="mt-5 text-primary-foreground/70 max-w-md">
              Photoreal AI previews, square-metre calculators with wastage, and a specifier on call
              — every tool free to use.
            </p>
            <div className="mt-9 space-y-3">
              {[
                {
                  icon: Sparkles,
                  title: "AI Room Visualizer",
                  desc: "Photoreal previews in seconds",
                  href: "/visualizer",
                },
                {
                  icon: Ruler,
                  title: "Floor Calculator",
                  desc: "Precise BOQ + installation cost",
                  href: "/calculator",
                },
                {
                  icon: Award,
                  title: "Talk to a specifier",
                  desc: "Free consultation, nationwide",
                  href: "/contact",
                },
              ].map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group flex items-center gap-4 p-4 border border-white/10 hover:border-gold/50 hover:bg-white/5 transition"
                >
                  <div className="h-11 w-11 shrink-0 grid place-items-center bg-gold/15 text-gold-light">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-sm text-primary-foreground/60">{f.desc}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-7">
            <div className="relative overflow-hidden shadow-elevated">
              <div className="relative aspect-[5/4] w-full">
                <Image
                  src={aiImg}
                  alt="AI Visualizer preview"
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute top-5 left-5 flex items-center gap-2 bg-charcoal-dark/70 backdrop-blur px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                preview
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATS */}
      <section className="container-fluid py-16 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-border">
        {stats.map(([n, l]) => (
          <div key={l}>
            <div className="font-display text-3xl md:text-5xl tracking-tight">{n}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {l}
            </div>
          </div>
        ))}
      </section>

      {/* PROJECTS */}
      <section className="container-fluid py-20 md:py-28">
        <Reveal className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
              05 · Reference projects
            </p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl tracking-tight text-balance">
              Delivered across Nigeria.
            </h2>
          </div>
          <Link
            href="/projects"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-gold transition"
          >
            All projects <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {projects.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <Link href="/projects" className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {p.type}
                  </div>
                  <div className="mt-1 font-display text-2xl tracking-tight group-hover:text-gold transition">
                    {p.name}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-surface border-y border-border py-20 md:py-28">
        <div className="container-fluid">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
              06 · Client word
            </p>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={t.n} delay={i * 0.08}>
                <figure className="h-full bg-background border border-border p-7 flex flex-col">
                  <Quote className="h-6 w-6 text-gold" />
                  <blockquote className="mt-5 font-display text-xl leading-snug tracking-tight">
                    &quot;{t.q}&quot;
                  </blockquote>
                  <figcaption className="mt-auto pt-6 text-sm">
                    <div className="font-medium">{t.n}</div>
                    <div className="text-muted-foreground text-xs">{t.r}</div>
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
          <div className="grid lg:grid-cols-2">
            <div className="bg-charcoal-dark text-primary-foreground p-10 md:p-14">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-light">
                For specifiers
              </p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">
                Open a trade account.
              </h2>
              <p className="mt-4 text-primary-foreground/70 max-w-md">
                Project pricing, free sample boxes, BIM files and a dedicated account manager for
                architects, contractors and developers.
              </p>
              <Link
                href="/contact"
                className="mt-8 inline-flex h-12 items-center bg-gold px-7 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal-dark hover:bg-primary-foreground transition"
              >
                Apply now
              </Link>
            </div>
            <div className="bg-surface border border-border border-t-0 lg:border-t lg:border-l-0 p-10 md:p-14">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">Samples</p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">
                Feel it before you buy.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                Order up to five samples for ₦2,500 each — fully refunded against your first order
                above 50 m².
              </p>
              <Link
                href="/products"
                className="mt-8 inline-flex h-12 items-center border border-charcoal-dark px-7 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-charcoal-dark hover:text-primary-foreground transition"
              >
                Order samples
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/**
 * Bestsellers stream in from the catalogue API, so the hero and the rest of
 * the page render immediately (§19, §28).
 */
async function BestsellerGrid() {
  const { data: products } = await getProducts({ featured: true, sort: "popular", per_page: 4 });

  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
