import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Youtube, ArrowUpRight } from "lucide-react";
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
      <div className="container-fluid py-20">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <Logo invert className="h-9 w-auto" />
            <p className="text-sm text-primary-foreground/70 max-w-sm text-pretty">
              Nigeria's premium flooring house — engineered surfaces, natural stone,
              luxury vinyl and architectural finishes for the country's most demanding
              residential and commercial spaces.
            </p>
            <div className="flex items-center gap-3">
              <a className="h-10 w-10 rounded-full border border-white/15 grid place-items-center hover:bg-white/10 transition" aria-label="Instagram" href="#"><Instagram className="h-4 w-4" /></a>
              <a className="h-10 w-10 rounded-full border border-white/15 grid place-items-center hover:bg-white/10 transition" aria-label="LinkedIn" href="#"><Linkedin className="h-4 w-4" /></a>
              <a className="h-10 w-10 rounded-full border border-white/15 grid place-items-center hover:bg-white/10 transition" aria-label="YouTube" href="#"><Youtube className="h-4 w-4" /></a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-light mb-4">{c.title}</h4>
                <ul className="space-y-2.5">
                  {c.links.map(([label, to]) => (
                    <li key={label}>
                      <Link to={to as string} className="text-sm text-primary-foreground/80 hover:text-gold-light transition">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-primary-foreground/60 font-mono">
            <span>© {new Date().getFullYear()} Floors Nigeria Limited</span>
            <span>·</span>
            <span>Lagos · Abuja · Port Harcourt</span>
          </div>
          <Link to="/contact" className="inline-flex items-center gap-1.5 text-sm text-gold-light hover:text-gold transition">
            Visit our showroom <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
