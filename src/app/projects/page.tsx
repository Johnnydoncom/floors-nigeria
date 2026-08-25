import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected commissions across hospitality, commercial and residential sectors in Nigeria.",
};

const projects = [
  {
    name: "Radisson Blu Lagos",
    loc: "Victoria Island · Lagos",
    type: "Hospitality",
    size: "4,200 m²",
    img: "/images/project-hotel.jpg",
  },
  {
    name: "Access Tower Ikoyi",
    loc: "Ikoyi · Lagos",
    type: "Commercial",
    size: "12,800 m²",
    img: "/images/project-office.jpg",
  },
  {
    name: "Banana Island Residence",
    loc: "Banana Island · Lagos",
    type: "Residential",
    size: "620 m²",
    img: "/images/project-residence.jpg",
  },
  {
    name: "Eko Signature Villa",
    loc: "Eko Atlantic · Lagos",
    type: "Residential",
    size: "1,150 m²",
    img: "/images/hero-living.jpg",
  },
  {
    name: "Transcorp Hilton Refresh",
    loc: "Maitama · Abuja",
    type: "Hospitality",
    size: "6,400 m²",
    img: "/images/collection-stone.jpg",
  },
  {
    name: "Sterling HQ",
    loc: "Marina · Lagos",
    type: "Commercial",
    size: "9,200 m²",
    img: "/images/collection-spc.jpg",
  },
];

export default function Projects() {
  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Portfolio</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            Specified for the country&apos;s most demanding buildings.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Selected commissions across hospitality, commercial and private residential.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid py-16 space-y-6">
        {projects.map((p, i) => (
          <Reveal key={p.name} delay={(i % 3) * 0.06}>
            <Link href="/projects" className="group grid md:grid-cols-12 gap-6 items-center">
              <div className={`md:col-span-7 ${i % 2 ? "md:order-2" : ""}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted">
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
              </div>
              <div className="md:col-span-5">
                <div className="font-mono text-[11px] uppercase tracking-widest text-gold">
                  {p.type} · {p.size}
                </div>
                <h2 className="mt-2 font-display text-3xl md:text-5xl tracking-tight group-hover:text-gold transition">
                  {p.name}
                </h2>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {p.loc}
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                  Read case study{" "}
                  <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}
