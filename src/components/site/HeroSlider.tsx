"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  eyebrow: string;
  title: string;
  accent: string;
  copy: string;
  img: string;
  alt: string;
  cta: { label: string; href: string };
  secondary: { label: string; href: string };
  spec: [string, string][];
};

const slides: Slide[] = [
  {
    eyebrow: "Real & Engineered Wood",
    title: "Floors built for",
    accent: "a lifetime.",
    copy: "European white-oak planks and herringbone parquet, UV-oiled and acclimatised for the Nigerian climate.",
    img: "/images/hero-floor.jpg",
    alt: "Wide-plank European oak herringbone flooring in a Lagos penthouse",
    cta: { label: "Browse wood flooring", href: "/products/real-wood-flooring" },
    secondary: { label: "Request samples", href: "/contact?enquiry=samples" },
    spec: [
      ["Wear layer", "4 mm oak"],
      ["Formats", "Plank · Chevron"],
      ["Warranty", "25 years"],
    ],
  },
  {
    eyebrow: "Luxury Vinyl & SPC",
    title: "Waterproof.",
    accent: "Commercial-grade.",
    copy: "Stone-polymer core planks rated for airports, hotels and hospitals — installed over any subfloor, in days not weeks.",
    img: "/images/collection-spc.jpg",
    alt: "Modern hallway finished in wood-look SPC flooring",
    cta: { label: "Explore SPC flooring", href: "/products/rigid-vinyl-floor-spc-flooring" },
    secondary: { label: "Get a trade quote", href: "/contact?enquiry=trade" },
    spec: [
      ["Core", "5.5 mm SPC"],
      ["Rating", "Class 33/42"],
      ["Install", "Click-lock"],
    ],
  },
  {
    eyebrow: "Laminate Flooring",
    title: "The look of timber,",
    accent: "built for wear.",
    copy: "Scratch-resistant laminate planks in warm oak and contemporary greys — quick to install and easy to live with.",
    img: "/images/hero-living.jpg",
    alt: "Living room finished in wide oak-look laminate flooring",
    cta: { label: "Shop laminate", href: "/products/laminate-flooring" },
    secondary: { label: "Talk to a specifier", href: "/contact" },
    spec: [
      ["Core", "HDF"],
      ["Install", "Click-lock"],
      ["Trims", "Matching skirting"],
    ],
  },
  {
    eyebrow: "Contract & Hospitality",
    title: "Trusted on",
    accent: "1.4M m² installed.",
    copy: "From Radisson Blu Lagos to Access Tower Ikoyi — nationwide supply, installation and aftercare under one roof.",
    img: "/images/project-hotel.jpg",
    alt: "Herringbone wood flooring in a hotel interior",
    cta: { label: "See our projects", href: "/projects" },
    secondary: { label: "Start a project", href: "/contact" },
    spec: [
      ["Projects", "480+ delivered"],
      ["Coverage", "Nationwide"],
      ["Crews", "In-house"],
    ],
  },
];

const DURATION = 6500;

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => go(1), DURATION);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, paused, go]);

  const slide = slides[index];

  return (
    <section
      className="relative h-[86svh] min-h-[560px] w-full overflow-hidden bg-charcoal-dark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured flooring collections"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.9 }, scale: { duration: 7, ease: "linear" } }}
          className="absolute inset-0"
        >
          <Image
            src={slide.img}
            alt={slide.alt}
            fill
            // The hero is the first thing on the page and almost always the LCP
            // element, so the visible slide is fetched eagerly rather than lazily.
            priority={index === 0}
            // A slide's image only mounts while that slide is on screen, so
            // lazy-loading it would only delay the visible hero.
            loading="eager"
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/80 via-charcoal-dark/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-charcoal-dark/70 to-transparent" />

      <div className="relative h-full container-fluid flex flex-col justify-end pb-10 md:pb-14 text-white">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2.5 border-l-2 border-gold pl-3 text-[11px] font-mono uppercase tracking-[0.24em] text-gold-light">
                {slide.eyebrow}
              </div>
              {/* The page's h1 is the server-rendered intro below the carousel, so it
                  stays the same for crawlers whichever slide is showing. */}
              <h2 className="mt-5 font-display text-[clamp(2.5rem,6.2vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
                {slide.title} <span className="text-gold-light">{slide.accent}</span>
              </h2>
              <p className="mt-5 max-w-xl text-base md:text-lg text-white/75 leading-relaxed">
                {slide.copy}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={slide.cta.href} className="group btn btn-gold">
                  {slide.cta.label}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href={slide.secondary.href}
                  className="btn btn-outline-light backdrop-blur-sm"
                >
                  {slide.secondary.label}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls + spec rail */}
        <div className="mt-10 flex flex-col gap-5 border-t border-white/15 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="h-10 w-10 grid place-items-center rounded-full border border-white/25 hover:bg-white/10 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="h-10 w-10 grid place-items-center rounded-full border border-white/25 hover:bg-white/10 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="ml-3 flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.eyebrow}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to ${s.eyebrow}`}
                  aria-current={i === index}
                  className="group relative h-0.5 w-10 md:w-16 rounded-full bg-white/25 overflow-hidden"
                >
                  <span
                    className={`absolute inset-y-0 left-0 bg-gold ${i === index ? "animate-[hero-progress_6.5s_linear_forwards]" : "w-0"}`}
                    style={i < index ? { width: "100%" } : undefined}
                  />
                </button>
              ))}
            </div>
            <span className="ml-2 font-mono text-xs text-white/55">
              0{index + 1} / 0{slides.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {slide.spec.map(([k, v]) => (
              <div key={k}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                  {k}
                </div>
                <div className="mt-1 text-sm font-medium text-white/90">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
