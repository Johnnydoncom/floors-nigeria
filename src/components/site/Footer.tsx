"use client";

import Link from "next/link";
import { Instagram, Linkedin, Youtube, ArrowRight, Phone, Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Products",
    links: [
      ["Engineered Wood", "/products"],
      ["SPC Flooring", "/products"],
      ["Luxury Vinyl", "/products"],
      ["Natural Stone", "/products"],
      ["Artificial Grass", "/products"],
      ["Wall Panels", "/products"],
    ],
  },
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

export function Footer() {
  return (
    <footer className="bg-charcoal-dark text-primary-foreground mt-24">
      {/* Gold rule */}
      <div className="h-1 gradient-gold" />

      {/* Newsletter / CTA band */}
      <div className="border-b border-white/10 bg-charcoal">
        <div className="container-fluid py-10 grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Specifying a floor? Start with samples.
            </h3>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Technical datasheets, BIM files and free swatches delivered nationwide.
            </p>
          </div>
          <form
            className="lg:col-span-7 flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="Work email address"
              aria-label="Work email address"
              className="flex-1 h-12 bg-white/5 border border-white/15 px-4 text-sm text-primary-foreground placeholder:text-primary-foreground/45 focus:outline-none focus:border-gold transition"
            />
            <button className="h-12 inline-flex items-center justify-center gap-2 bg-gold px-6 text-sm font-semibold uppercase tracking-[0.08em] text-charcoal-dark hover:bg-gold-light transition">
              Request samples <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="container-fluid py-16">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <Logo invert className="h-9 w-auto" />
            <p className="text-sm text-primary-foreground/70 max-w-sm text-pretty">
              Nigeria&apos;s premium flooring house — engineered surfaces, natural stone,
              luxury vinyl and architectural finishes for the country&apos;s most demanding
              residential and commercial spaces.
            </p>
            <ul className="space-y-2.5 text-sm text-primary-foreground/75">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-gold-light mt-0.5 shrink-0" />
                <span>Showroom: Admiralty Way, Lekki Phase 1, Lagos</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-gold-light shrink-0" />
                <a href="tel:+2348000000000" className="hover:text-gold-light transition">+234 800 000 0000</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gold-light shrink-0" />
                <a href="mailto:hello@floors.ng" className="hover:text-gold-light transition">hello@floors.ng</a>
              </li>
            </ul>
            <div className="flex items-center gap-3">
              <a className="h-10 w-10 border border-white/15 grid place-items-center hover:bg-gold hover:text-charcoal-dark hover:border-gold transition" aria-label="Instagram" href="#"><Instagram className="h-4 w-4" /></a>
              <a className="h-10 w-10 border border-white/15 grid place-items-center hover:bg-gold hover:text-charcoal-dark hover:border-gold transition" aria-label="LinkedIn" href="#"><Linkedin className="h-4 w-4" /></a>
              <a className="h-10 w-10 border border-white/15 grid place-items-center hover:bg-gold hover:text-charcoal-dark hover:border-gold transition" aria-label="YouTube" href="#"><Youtube className="h-4 w-4" /></a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-light mb-4">{c.title}</h4>
                <ul className="space-y-2.5">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href as string} className="text-sm text-primary-foreground/75 hover:text-gold-light transition">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-primary-foreground/55 font-mono">
            <span>© {new Date().getFullYear()} Floors Nigeria Limited</span>
            <span>·</span>
            <span>RC 1234567</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-mono uppercase tracking-[0.16em] text-primary-foreground/55">
            <span>ISO 9001 Certified</span>
            <span>FSC® Sourced Timber</span>
            <span>25-Year Warranty</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
