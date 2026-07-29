import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Upload, ImageIcon, Wand2, Send, RotateCcw, Download, Share2 } from "lucide-react";
import { useState } from "react";
import aiImg from "@/assets/ai-visualizer.jpg";
import heroImg from "@/assets/hero-living.jpg";
import oakImg from "@/assets/collection-oak.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/visualizer")({
  component: Visualizer,
  head: () => ({
    meta: [
      { title: "AI Room Visualizer — Floors NG" },
      { name: "description", content: "Upload a room photo and preview every Floors NG product in photoreal fidelity, powered by AI." },
      { property: "og:title", content: "AI Room Visualizer — Floors NG" },
    ],
  }),
});

const swatches = [
  { name: "Engineered Oak", img: oakImg },
  { name: "Metropolis SPC", img: spcImg },
  { name: "Savoy Marble", img: stoneImg },
  { name: "Walnut Heritage", img: aiImg },
];

const prompts = [
  "Warm oak, herringbone, morning light",
  "Polished marble, minimal Lagos penthouse",
  "Matte walnut for a mid-century study",
  "Ivory limestone for a spa bathroom",
];

function Visualizer() {
  const [prompt, setPrompt] = useState("");
  const [swatch, setSwatch] = useState(0);

  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 border border-gold/30 px-3 py-1 text-xs font-mono uppercase tracking-widest text-gold">
            <Sparkles className="h-3 w-3" /> AI Studio · Beta
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            Design in your room, before we deliver it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload a photo. Pick a floor. Our AI renders the space in photoreal fidelity —
            with correct lighting, plank orientation and grout depth.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid mt-12 pb-24">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-8">
            <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-charcoal-dark shadow-elevated">
              <img src={heroImg} alt="Room preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />

              {/* top bar */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 px-3 py-1.5 text-[11px] font-mono tracking-wider text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> RENDERING · 72%
                </div>
                <div className="flex items-center gap-2">
                  {[RotateCcw, Download, Share2].map((I, i) => (
                    <button key={i} className="h-10 w-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white hover:bg-white/25 transition">
                      <I className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* before/after divider (visual only) */}
              <motion.div
                initial={{ left: "60%" }}
                animate={{ left: ["60%", "40%", "60%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-px bg-white/70 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white text-charcoal-dark grid place-items-center text-xs font-mono">↔</div>
              </motion.div>

              {/* prompt input */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/25 p-2">
                  <div className="h-10 w-10 grid place-items-center rounded-xl gradient-gold text-charcoal-dark shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the mood you want…"
                    className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50 px-2"
                  />
                  <button className="h-10 px-4 rounded-xl bg-white text-charcoal-dark text-sm font-medium hover:bg-gold-light transition inline-flex items-center gap-1.5">
                    Render <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrompt(p)}
                      className="text-xs rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-white/85 hover:bg-white/20 border border-white/15 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Upload row */}
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              {[
                { icon: Upload, title: "Upload photo", desc: "Any room, any angle" },
                { icon: ImageIcon, title: "Sample rooms", desc: "24 pre-lit interiors" },
                { icon: Wand2, title: "AI enhance", desc: "One-click perfection" },
              ].map((a) => (
                <button key={a.title} className="text-left p-5 rounded-2xl border border-border hover:border-gold/40 hover:bg-surface transition group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 grid place-items-center rounded-xl bg-surface border border-border group-hover:border-gold/40">
                      <a.icon className="h-4 w-4 text-gold" />
                    </div>
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-border bg-surface p-6">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Selected material</div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {swatches.map((s, i) => (
                  <button key={s.name} onClick={() => setSwatch(i)} className={`relative aspect-square rounded-xl overflow-hidden transition ${swatch === i ? "ring-2 ring-gold ring-offset-2 ring-offset-surface" : ""}`}>
                    <img src={s.img} alt={s.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <div className="font-display text-xl">{swatches[swatch].name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Suitable · Living, dining, bedroom</div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2"><span>Warmth</span><span>72%</span></div>
                  <div className="h-1 rounded-full bg-border overflow-hidden"><div className="h-full w-[72%] gradient-gold" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2"><span>Contrast</span><span>44%</span></div>
                  <div className="h-1 rounded-full bg-border overflow-hidden"><div className="h-full w-[44%] gradient-gold" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2"><span>Grain intensity</span><span>60%</span></div>
                  <div className="h-1 rounded-full bg-border overflow-hidden"><div className="h-full w-[60%] gradient-gold" /></div>
                </div>
              </div>

              <Link to="/products" className="mt-6 h-11 w-full inline-flex items-center justify-center rounded-full bg-charcoal text-primary-foreground text-sm font-medium hover:bg-charcoal-dark transition">
                Add to project
              </Link>
            </div>

            <div className="rounded-3xl border border-border p-6">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Recent renders</div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[heroImg, aiImg, stoneImg, spcImg, oakImg, hotelImg].map((g, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={g} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
