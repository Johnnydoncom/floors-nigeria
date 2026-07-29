import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, Star } from "lucide-react";
import oakImg from "@/assets/collection-oak.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import aiImg from "@/assets/ai-visualizer.jpg";
import hotelImg from "@/assets/project-hotel.jpg";
import officeImg from "@/assets/project-office.jpg";
import residenceImg from "@/assets/project-residence.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/products")({
  component: Products,
  head: () => ({
    meta: [
      { title: "Products — Floors NG" },
      { name: "description", content: "Browse the full catalogue: engineered wood, SPC, luxury vinyl, natural stone, artificial grass and wall panels." },
      { property: "og:title", content: "Products — Floors NG" },
      { property: "og:description", content: "Nigeria's most curated flooring catalogue." },
    ],
  }),
});

const categories = ["All", "Engineered Wood", "SPC", "Luxury Vinyl", "Natural Stone", "Wall Panels", "Artificial Grass"];

const products = [
  { slug: "engineered-oak", name: "Engineered Oak Classic", cat: "Engineered Wood", price: 18500, tag: "Bestseller", img: oakImg, rating: 4.9 },
  { slug: "metropolis-spc", name: "Metropolis SPC 5.5mm", cat: "SPC", price: 9800, tag: "New", img: spcImg, rating: 4.8 },
  { slug: "savoy-marble", name: "Savoy Book-Matched Marble", cat: "Natural Stone", price: 34000, tag: "Luxury", img: stoneImg, rating: 5.0 },
  { slug: "walnut-heritage", name: "Walnut Heritage Plank", cat: "Engineered Wood", price: 22400, tag: "", img: aiImg, rating: 4.9 },
  { slug: "commercial-lvt", name: "Commercial LVT Contract", cat: "Luxury Vinyl", price: 7600, tag: "Contract", img: officeImg, rating: 4.7 },
  { slug: "herringbone-elite", name: "Herringbone Elite Oak", cat: "Engineered Wood", price: 26800, tag: "Signature", img: hotelImg, rating: 5.0 },
  { slug: "arctic-stone", name: "Arctic Limestone Slab", cat: "Natural Stone", price: 28900, tag: "", img: residenceImg, rating: 4.8 },
  { slug: "acoustic-wall", name: "Acoustic Slat Wall Panel", cat: "Wall Panels", price: 14500, tag: "New", img: aiImg, rating: 4.9 },
];

function Products() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const filtered = products.filter(
    (p) => (cat === "All" || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <section className="pt-32 md:pt-40 pb-10 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Catalogue</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            Every surface, engineered for Nigeria's climate.
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg">
            {products.length}+ products across seven categories. Filter by material,
            application or performance profile.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid sticky top-16 md:top-20 z-30 bg-background/85 backdrop-blur-xl py-4 border-y border-border">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-surface border border-border pl-4 pr-2 h-11 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, colours, finishes…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-11 px-4 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                  cat === c
                    ? "bg-charcoal text-primary-foreground border-charcoal"
                    : "bg-transparent border-border hover:border-foreground/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="h-11 px-4 rounded-full text-sm font-medium border border-border hover:border-foreground/40 inline-flex items-center gap-2 whitespace-nowrap">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
      </section>

      <section className="container-fluid py-14">
        <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground font-mono">
          <span>{filtered.length} products</span>
          <span>Sorted by relevance</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 4) * 0.05}>
              <Link to="/products/$slug" params={{ slug: p.slug }} className="group block">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                  <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.06]" />
                  {p.tag && (
                    <div className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
                      {p.tag}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/85 backdrop-blur opacity-0 group-hover:opacity-100 transition">
                    <ArrowUpRight className="h-4 w-4 text-charcoal-dark" />
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{p.cat}</div>
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-gold text-gold" /> {p.rating}
                    </div>
                  </div>
                  <h3 className="mt-1 font-display text-xl tracking-tight">{p.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-mono text-sm">₦{p.price.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/m²</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
