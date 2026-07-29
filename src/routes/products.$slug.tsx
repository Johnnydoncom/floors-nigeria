import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Download, Heart, Share2, ShieldCheck, Truck, Ruler, Sparkles } from "lucide-react";
import oakImg from "@/assets/collection-oak.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import hotelImg from "@/assets/project-hotel.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetails,
  head: ({ params }) => ({
    meta: [
      { title: `${prettify(params.slug)} — Floors NG` },
      { name: "description", content: `Explore ${prettify(params.slug)}. Specifications, warranty, downloads and instant quote.` },
      { property: "og:title", content: `${prettify(params.slug)} — Floors NG` },
    ],
  }),
});

function prettify(s: string) {
  return s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const gallery = [oakImg, hotelImg, spcImg, stoneImg];

function ProductDetails() {
  const { slug } = Route.useParams();
  const name = prettify(slug);
  const [active, setActive] = useState(0);

  return (
    <>
      <section className="pt-28 md:pt-32 container-fluid">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-foreground">Products</Link>
          <span>/</span>
          <span className="text-foreground">{name}</span>
        </div>
      </section>

      <section className="container-fluid pt-8 pb-16 grid lg:grid-cols-12 gap-10">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <Reveal>
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted shadow-luxe">
              <img src={gallery[active]} alt={name} className="h-full w-full object-cover" />
              <button className="absolute top-4 left-4 h-10 px-4 rounded-full bg-white/90 backdrop-blur text-xs font-mono uppercase tracking-widest text-charcoal-dark hover:bg-white transition">
                360° view
              </button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative aspect-square rounded-xl overflow-hidden transition ${
                    active === i ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Details */}
        <div className="lg:col-span-5">
          <Reveal delay={0.1}>
            <Link to="/products" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to catalogue
            </Link>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.24em] text-gold">Engineered Wood · SKU FN-{slug.slice(0, 3).toUpperCase()}-2024</p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">{name}</h1>
            <p className="mt-4 text-muted-foreground text-lg">
              European white oak, brushed and UV-oiled. 220mm × 2200mm × 14mm.
              Suitable for radiant heating and open-plan residential specification.
            </p>

            <div className="mt-8 flex items-baseline gap-3">
              <span className="font-mono text-4xl">₦18,500</span>
              <span className="text-sm text-muted-foreground">/ m² excl. VAT</span>
            </div>

            <div className="mt-6">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Finish</div>
              <div className="flex gap-2">
                {["Natural", "Smoked", "Walnut", "Ebony"].map((f, i) => (
                  <button key={f} className={`h-10 px-4 rounded-full text-sm border transition ${i === 0 ? "border-charcoal bg-charcoal text-primary-foreground" : "border-border hover:border-foreground/40"}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link to="/contact" className="flex-1 min-w-[180px] h-12 inline-flex items-center justify-center rounded-full bg-charcoal text-primary-foreground px-6 text-sm font-medium hover:bg-charcoal-dark transition">
                Request quote
              </Link>
              <Link to="/contact" className="h-12 inline-flex items-center justify-center rounded-full border border-border px-6 text-sm font-medium hover:bg-muted transition">
                Order sample · ₦2,500
              </Link>
              <button className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-muted"><Heart className="h-4 w-4" /></button>
              <button className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-muted"><Share2 className="h-4 w-4" /></button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: "25-yr warranty" },
                { icon: Truck, label: "Free delivery 500 m²+" },
                { icon: Sparkles, label: "AI Visualize" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl border border-border p-4 text-center">
                  <f.icon className="h-4 w-4 mx-auto text-gold" />
                  <div className="mt-2 text-xs">{f.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Specs */}
      <section className="container-fluid py-16 border-t border-border">
        <div className="grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Specifications</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">Every detail, on record.</h2>
            <div className="mt-6 flex gap-2 flex-wrap">
              <button className="h-10 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted inline-flex items-center gap-2">
                <Download className="h-3.5 w-3.5" /> Tech sheet
              </button>
              <button className="h-10 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted inline-flex items-center gap-2">
                <Download className="h-3.5 w-3.5" /> Installation
              </button>
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            <dl className="divide-y divide-border border-y border-border">
              {[
                ["Construction", "Multi-ply engineered · 14mm thickness"],
                ["Wear layer", "3.5mm European white oak veneer"],
                ["Plank size", "220 × 2200 mm"],
                ["Finish", "Brushed · UV-oil · Matte"],
                ["Installation", "Click-lock 5G · Radiant-heat compatible"],
                ["Fire rating", "Cfl-s1 (EN 13501-1)"],
                ["Warranty", "25 years residential · 10 years commercial"],
                ["Origin", "Italy"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 py-4 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="container-fluid py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">You may also love</h2>
          <Link to="/products" className="text-sm font-medium hover:text-gold">View all →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {gallery.map((g, i) => (
            <Link key={i} to="/products/$slug" params={{ slug: "walnut-heritage" }} className="group block">
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={g} alt="" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
              </div>
              <div className="pt-3 flex items-center justify-between">
                <span className="font-display text-lg">Related plank {i + 1}</span>
                <span className="font-mono text-xs text-muted-foreground">₦{(15000 + i * 2200).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
