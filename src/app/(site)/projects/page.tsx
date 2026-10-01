import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PROJECTS } from "@/lib/content/projects";

export const metadata: Metadata = pageMetadata({
  title: "Flooring Projects in Nigeria",
  description:
    "Selected flooring commissions across hospitality, commercial and residential sectors in Lagos, Abuja and beyond.",
  path: "/projects",
});

export default function Projects() {
  return (
    <>
      <section className="pt-header md:pt-[calc(var(--header-height)+2rem)] container-fluid">
        <Reveal>
          <p className="eyebrow">Portfolio</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            Specified for the country&apos;s most demanding buildings.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Selected commissions across hospitality, commercial and private residential.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid py-16 space-y-6">
        {PROJECTS.map((p, i) => (
          <Reveal key={p.slug} delay={(i % 3) * 0.06}>
            <Link
              href={`/projects/${p.slug}`}
              className="group grid md:grid-cols-12 gap-6 items-center"
            >
              <div className={`md:col-span-7 ${i % 2 ? "md:order-2" : ""}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(min-width: 768px) 58vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
              </div>
              <div className="md:col-span-5">
                <div className="eyebrow">
                  {p.sector} · {p.area}
                </div>
                <h2 className="mt-2 font-display text-3xl md:text-5xl tracking-tight group-hover:text-gold transition">
                  {p.name}
                </h2>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.location} · {p.city}
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                  View project{" "}
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
