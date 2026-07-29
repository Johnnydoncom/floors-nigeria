import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles, Ruler, MessageSquareText, Play, Star, ShieldCheck, Award, Truck } from "lucide-react";
import heroImg from "@/assets/hero-living.jpg";
import oakImg from "@/assets/collection-oak.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import hotelImg from "@/assets/project-hotel.jpg";
import officeImg from "@/assets/project-office.jpg";
import residenceImg from "@/assets/project-residence.jpg";
import aiImg from "@/assets/ai-visualizer.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Floors NG — Premium Flooring for Nigeria's Finest Spaces" },
      { name: "description", content: "Discover engineered wood, SPC, luxury vinyl, natural stone and wall panels. Try the AI Room Visualizer and get a quote in minutes." },
      { property: "og:title", content: "Floors NG — Premium Flooring for Nigeria's Finest Spaces" },
      { property: "og:description", content: "Nigeria's premium flooring house. AI-powered visualisation, expert installation, nationwide delivery." },
    ],
  }),
});

const collections = [
  { name: "Engineered Oak", tag: "Wood", img: oakImg, price: "from ₦18,500 /m²", desc: "European white-oak planks, UV-oiled for warmth and longevity." },
  { name: "Metropolis SPC", tag: "Vinyl", img: spcImg, price: "from ₦9,800 /m²", desc: "Waterproof stone-polymer core with 0.5mm wear layer." },
  { name: "Savoy Marble", tag: "Stone", img: stoneImg, price: "from ₦34,000 /m²", desc: "Book-matched natural marble with honed or polished finish." },
];

const projects = [
  { name: "Radisson Blu Lagos", type: "Hospitality · 4,200 m²", img: hotelImg },
  { name: "Access Tower Ikoyi", type: "Commercial · 12,800 m²", img: officeImg },
  { name: "Banana Island Residence", type: "Residential · 620 m²", img: residenceImg },
];

const stats = [
  ["1.4M", "m² installed"],
  ["12", "Years of craft"],
  ["36", "Global suppliers"],
  ["98%", "On-time delivery"],
];

const industries = [
  "Residential", "Commercial", "Hospitality", "Healthcare", "Education", "Retail", "Sports", "Aviation",
];

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Luxury Nigerian interior with wide-plank oak flooring" className="h-full w-full object-cover" width={1920} height={1200} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
        </div>

        <div className="relative container-fluid pt-32 md:pt-40 pb-16 min-h-[100svh] flex flex-col justify-between text-white">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-mono tracking-wider"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold-light animate-pulse" />
              NEW · AI Room Visualizer 2.0
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 font-display text-[clamp(2.75rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.03em] text-balance"
            >
              Surfaces that <em className="not-italic text-gradient-gold">outlast</em>
              <br className="hidden md:block" /> the architecture.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="mt-6 max-w-xl text-lg text-white/85 text-pretty"
            >
              Nigeria's premium flooring house. Engineered wood, natural stone, luxury vinyl and
              architectural finishes — specified, delivered and installed with obsessive precision.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link to="/products" className="group h-12 inline-flex items-center gap-2 rounded-full bg-white text-charcoal-dark px-6 text-sm font-medium hover:bg-gold-light transition">
                Explore collections <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/visualizer" className="group h-12 inline-flex items-center gap-2 rounded-full border border-white/30 backdrop-blur-md px-6 text-sm font-medium hover:bg-white/10 transition">
                <Sparkles className="h-4 w-4 text-gold-light" /> Try the AI Visualizer
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.7 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-12 border-t border-white/15"
          >
            {stats.map(([n, l]) => (
              <div key={l}>
                <div className="font-mono text-3xl md:text-5xl text-white tracking-tight">{n}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MARQUEE / PARTNERS */}
      <section className="border-y border-border bg-surface py-8 overflow-hidden">
        <div className="container-fluid flex flex-wrap items-center justify-between gap-6 text-xs uppercase tracking-[0.24em] font-mono text-muted-foreground">
          <span>Specified by</span>
          {["Julius Berger", "Cappa & D'Alberto", "Chapel Hill", "James Cubitt", "Cobalt Partners", "Design Union"].map((n) => (
            <span key={n} className="text-foreground/70">{n}</span>
          ))}
        </div>
      </section>

      {/* FEATURED COLLECTIONS */}
      <section className="container-fluid py-24 md:py-32">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">01 · Collections</p>
            <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight text-balance">
              Curated by architects.<br /> Chosen by connoisseurs.
            </h2>
          </div>
          <Link to="/collections" className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-gold transition">
            View all collections <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {collections.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.1}>
              <Link to="/products" className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]" />
                  <div className="absolute top-4 left-4 rounded-full bg-white/85 backdrop-blur px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
                    {c.tag}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                    <div className="font-mono text-[11px] tracking-widest opacity-80">{c.price}</div>
                  </div>
                </div>
                <div className="pt-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl tracking-tight">{c.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">{c.desc}</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 mt-1 shrink-0 group-hover:text-gold group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI STUDIO */}
      <section className="bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid py-24 md:py-36">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-5">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold-light">02 · AI Studio</p>
              <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight text-balance">
                See it in your space<br />before you commit.
              </h2>
              <p className="mt-6 text-primary-foreground/70 text-lg max-w-md">
                Upload a photo of your room. Our AI renders every plank, tile and finish in
                photoreal fidelity — with accurate lighting, joinery and material response.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  { icon: Sparkles, title: "AI Room Visualizer", desc: "Photoreal previews in seconds" },
                  { icon: Ruler, title: "Floor Calculator", desc: "Precise BOQ + installation cost" },
                  { icon: MessageSquareText, title: "Design Assistant", desc: "Chat with a certified specifier" },
                ].map((f) => (
                  <Link key={f.title} to="/visualizer" className="group flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:bg-white/5 transition">
                    <div className="h-11 w-11 grid place-items-center rounded-xl bg-gold/15 text-gold-light shrink-0">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{f.title}</div>
                      <div className="text-sm text-primary-foreground/60">{f.desc}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-7">
              <div className="relative rounded-3xl overflow-hidden shadow-elevated">
                <img src={aiImg} alt="AI Visualizer preview" loading="lazy" className="w-full aspect-[5/4] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-charcoal-dark/60 via-transparent to-transparent" />

                <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 px-3 py-1.5 text-[11px] font-mono tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE PREVIEW
                  </div>
                  <button className="h-10 w-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 hover:bg-white/25 transition">
                    <Play className="h-4 w-4 pl-0.5" />
                  </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 grid place-items-center rounded-full gradient-gold text-charcoal-dark">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">Try <span className="italic">"warm oak, herringbone pattern, morning light"</span></div>
                      <div className="mt-1 h-1 rounded-full bg-white/15 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "72%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          className="h-full gradient-gold"
                        />
                      </div>
                    </div>
                    <span className="font-mono text-xs text-white/70">72%</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="container-fluid py-24 md:py-32">
        <Reveal className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">03 · Why Floors NG</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight text-balance">
            The country's most exacting spaces begin at the floor.
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Award, title: "European sourcing", desc: "Direct partnerships with mills in Italy, Belgium, Germany and Turkey." },
            { icon: ShieldCheck, title: "25-year warranty", desc: "Category-leading residential and commercial-grade guarantees." },
            { icon: Truck, title: "Nationwide install", desc: "Certified crews in Lagos, Abuja and Port Harcourt — same-week mobilisation." },
            { icon: Star, title: "Concierge specification", desc: "One dedicated specifier from mood board to snag list." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="group h-full p-8 rounded-3xl bg-surface border border-border hover-lift hover:border-gold/40 hover:shadow-luxe">
                <div className="h-12 w-12 grid place-items-center rounded-2xl bg-background border border-border text-gold">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-display text-2xl tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PROJECTS */}
      <section className="bg-surface py-24 md:py-32">
        <div className="container-fluid">
          <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">04 · Projects</p>
              <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight text-balance">Recent commissions.</h2>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-gold transition">
              Full portfolio <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <div className="grid lg:grid-cols-12 gap-5 md:gap-6">
            <Reveal className="lg:col-span-7">
              <Link to="/projects" className="group block relative aspect-[16/11] overflow-hidden rounded-3xl">
                <img src={projects[0].img} alt={projects[0].name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 text-white">
                  <div className="font-mono text-[11px] uppercase tracking-widest opacity-80">{projects[0].type}</div>
                  <div className="mt-1 font-display text-3xl md:text-4xl">{projects[0].name}</div>
                </div>
              </Link>
            </Reveal>
            <div className="lg:col-span-5 grid gap-5 md:gap-6">
              {projects.slice(1).map((p, i) => (
                <Reveal key={p.name} delay={0.1 + i * 0.08}>
                  <Link to="/projects" className="group block relative aspect-[16/10] overflow-hidden rounded-3xl">
                    <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <div className="font-mono text-[11px] uppercase tracking-widest opacity-80">{p.type}</div>
                      <div className="mt-1 font-display text-2xl">{p.name}</div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="container-fluid py-24 md:py-32">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">05 · Industries</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight max-w-3xl text-balance">
            Specified across every serious sector.
          </h2>
        </Reveal>
        <div className="mt-14 border-t border-border">
          {industries.map((i, idx) => (
            <Reveal key={i} delay={idx * 0.04}>
              <Link to="/industries" className="group flex items-center justify-between py-6 md:py-8 border-b border-border hover:pl-4 transition-all duration-500">
                <div className="flex items-baseline gap-6 md:gap-10">
                  <span className="font-mono text-xs md:text-sm text-muted-foreground">0{idx + 1}</span>
                  <span className="font-display text-3xl md:text-5xl tracking-tight group-hover:text-gold transition-colors">{i}</span>
                </div>
                <ArrowUpRight className="h-6 w-6 md:h-8 md:w-8 opacity-40 group-hover:opacity-100 group-hover:text-gold transition" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-charcoal text-primary-foreground py-24 md:py-32">
        <div className="container-fluid grid md:grid-cols-12 gap-10 items-center">
          <Reveal className="md:col-span-2">
            <div className="font-mono text-6xl text-gold-light leading-none">"</div>
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-8">
            <p className="font-display text-2xl md:text-4xl leading-tight text-balance">
              Floors NG is the only house I trust for large-format commercial installs.
              The specification is precise, the crews are disciplined, and the finish reads
              exactly like the sample.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold to-gold-light" />
              <div>
                <div className="font-medium">Arch. Adaora Nwosu</div>
                <div className="text-sm text-primary-foreground/60">Principal, Cobalt Partners · Lagos</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="container-fluid py-24 md:py-36">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-charcoal-dark via-charcoal to-charcoal-dark p-10 md:p-20 text-primary-foreground">
            <div className="absolute inset-0 bg-grain opacity-40" />
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full gradient-gold opacity-25 blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-10 items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold-light">Ready to specify</p>
                <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight text-balance">
                  Book a private showroom visit.
                </h2>
                <p className="mt-4 text-primary-foreground/75 max-w-md">
                  See every sample under natural light. Meet your specifier. Leave with a
                  costed proposal.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link to="/contact" className="h-12 inline-flex items-center gap-2 rounded-full bg-white text-charcoal-dark px-6 text-sm font-medium hover:bg-gold-light transition">
                  Book consultation <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/calculator" className="h-12 inline-flex items-center gap-2 rounded-full border border-white/25 px-6 text-sm font-medium hover:bg-white/10 transition">
                  Run the calculator
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
