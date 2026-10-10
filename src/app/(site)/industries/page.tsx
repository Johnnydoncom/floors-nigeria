import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Flooring for Homes, Offices, Hotels & Hospitals",
  description:
    "Flooring engineered for residential, hospitality, commercial, healthcare, education and retail spaces in Nigeria — specified, supplied and installed by Floor Nigeria.",
  path: "/industries",
});

const industries = [
  {
    name: "Residential",
    id: "residential",
    href: "/rooms/living-room",
    desc: "Wide-plank oak, herringbone parquet and stone for homes.",
    img: "/images/hero-living.jpg",
  },
  {
    name: "Commercial",
    id: "commercial",
    href: "/rooms/office",
    desc: "LVT, SPC and carpet-tile for Grade-A office towers.",
    img: "/images/project-office.jpg",
  },
  {
    name: "Hospitality",
    id: "hospitality",
    href: "/rooms/hotel",
    desc: "Statement floors for hotels, restaurants and lounges.",
    img: "/images/project-hotel.jpg",
  },
  {
    name: "Healthcare",
    id: "healthcare",
    href: "/products/vinyl-flooring",
    desc: "Hygienic, sound-absorbing surfaces for clinical spaces.",
    img: "/images/collection-spc.jpg",
  },
  {
    name: "Education",
    id: "education",
    href: "/products/rigid-vinyl-floor-spc-flooring",
    desc: "Impact-rated flooring for schools and universities.",
    img: "/images/project-residence.jpg",
  },
  {
    name: "Retail",
    id: "retail",
    href: "/rooms/retail",
    desc: "Luxury display floors that outlast the traffic.",
    img: "/images/collection-stone.jpg",
  },
];

export default function Industries() {
  return (
    <>
      <section className="pt-header md:pt-[calc(var(--header-height)+2rem)] container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Solutions</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            One house. Every sector.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {industries.map((ind, idx) => (
          <Reveal key={ind.name} delay={(idx % 3) * 0.06}>
            <Link id={ind.id} href={ind.href} className="group block scroll-mt-40">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-muted">
                <Image
                  src={ind.img}
                  alt={ind.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 className="font-display text-3xl">{ind.name}</h3>
                  <p className="mt-1 text-sm opacity-85">{ind.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm">
                    Explore <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}
