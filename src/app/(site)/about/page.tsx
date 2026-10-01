import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Floor Nigeria",
  description:
    "The story, the craft and the installation crews behind Floor Nigeria — premium flooring supplied and installed across Lagos, Abuja and nationwide.",
  path: "/about",
});

const heroImg = "/images/hero-living.jpg";
const stoneImg = "/images/collection-stone.jpg";

export default function About() {
  return (
    <>
      <section className="pt-header md:pt-[calc(var(--header-height)+3rem)] container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">About</p>
          <h1 className="mt-4 font-display text-5xl md:text-8xl tracking-tight max-w-5xl text-balance">
            We build the surface every serious building depends on.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid mt-16">
        <Reveal>
          <div className="relative aspect-[16/8] overflow-hidden rounded-3xl">
            <Image
              src={heroImg}
              alt="Floors NG showroom"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </section>

      <section className="container-fluid py-24 grid md:grid-cols-12 gap-10">
        <Reveal className="md:col-span-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Our story</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl tracking-tight text-balance">
            A house built on obsession.
          </h2>
        </Reveal>
        <Reveal
          delay={0.1}
          className="md:col-span-7 space-y-6 text-lg text-muted-foreground text-pretty"
        >
          <p>
            Founded in Lagos in 2013, Floors NG began as a five-person specification studio
            importing engineered oak for a single Ikoyi villa. Twelve years later we operate three
            showrooms, employ four installation crews, and specify surfaces for over 1.4 million
            square metres of finished floor.
          </p>
          <p>
            What hasn&apos;t changed is the obsession. Every plank we deliver is inspected in-house.
            Every crew is certified. Every specification is signed off by a named partner.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-foreground font-medium"
          >
            Visit our Lagos flagship <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      <section className="bg-surface py-24">
        <div className="container-fluid grid md:grid-cols-4 gap-8">
          {[
            ["1.4M", "m² installed since 2013"],
            ["36", "Global sourcing partners"],
            ["24", "Certified installers on staff"],
            ["3", "Showrooms across Nigeria"],
          ].map(([n, l]) => (
            <Reveal key={l}>
              <div className="font-mono text-5xl md:text-6xl tracking-tight">{n}</div>
              <div className="mt-2 text-sm text-muted-foreground">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-fluid py-24 grid md:grid-cols-12 gap-10 items-center">
        <Reveal className="md:col-span-6">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden">
            <Image
              src={stoneImg}
              alt="Craft"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="md:col-span-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Craft</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">
            Signed off by a named partner. Every time.
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            No junior specifiers, no anonymous project managers. When you engage Floors NG, you get
            a partner whose name is on the certificate of practical completion.
          </p>
        </Reveal>
      </section>
    </>
  );
}
