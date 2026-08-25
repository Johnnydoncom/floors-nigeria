"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, Star, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { CATEGORIES, PRODUCTS, naira } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

const SORTS = ["Featured", "Price: low to high", "Price: high to low", "Top rated"] as const;

export default function Products() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Featured");
  const cart = useCart();

  const list = useMemo(() => {
    let l = PRODUCTS.filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === "Price: low to high") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") l = [...l].sort((a, b) => b.price - a.price);
    if (sort === "Top rated") l = [...l].sort((a, b) => b.rating - a.rating);
    return l;
  }, [cat, q, sort]);

  return (
    <>
      <section className="bg-charcoal-dark text-primary-foreground pt-[104px] md:pt-[148px] pb-14">
        <div className="container-fluid">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-light">Catalogue</p>
          <h1 className="mt-4 font-display text-4xl md:text-6xl tracking-tight max-w-3xl text-balance">
            Every surface we supply, in one place.
          </h1>
          <p className="mt-4 max-w-xl text-primary-foreground/70">
            {PRODUCTS.length} specification-ready products across {CATEGORIES.length} material families — priced per square metre, ex-VAT.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-[72px] md:top-[116px] z-30 bg-background border-b border-border">
        <div className="container-fluid flex flex-wrap items-center gap-3 py-4">
          <div className="flex items-center gap-2 border border-border px-3 h-10 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the catalogue"
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 border border-border px-3 h-10">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className="bg-transparent text-sm outline-none"
            >
              {SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="container-fluid flex gap-2 overflow-x-auto pb-4">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap border px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition ${
                cat === c ? "border-charcoal-dark bg-charcoal-dark text-primary-foreground" : "border-border hover:border-gold hover:text-gold"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="container-fluid py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.06}>
              <article className="group h-full flex flex-col border border-border bg-card hover:border-gold/50 hover:shadow-luxe transition">
                <Link href={`/products/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                  {p.tag && (
                    <span className="absolute top-3 left-3 bg-gold px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
                      {p.tag}
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{p.category}</span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <Star className="h-3 w-3 fill-gold text-gold" /> {p.rating}
                    </span>
                  </div>
                  <Link href={`/products/${p.slug}`} className="mt-2 font-display text-xl tracking-tight hover:text-gold transition">
                    {p.name}
                  </Link>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.blurb}</p>
                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-lg">{naira(p.price)}</div>
                      <div className="text-[11px] text-muted-foreground">per m² excl. VAT</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        aria-label={`Add ${p.name} to cart`}
                        onClick={() => {
                          cart.add({ slug: p.slug, name: p.name, img: p.img, finish: p.finishes[0], price: p.price, qty: 10 });
                          toast.success(`${p.name} added — 10 m²`);
                        }}
                        className="h-10 w-10 grid place-items-center border border-border hover:border-gold hover:text-gold transition"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/products/${p.slug}`}
                        className="h-10 px-4 inline-flex items-center gap-1 bg-charcoal-dark text-primary-foreground text-xs font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition"
                      >
                        View <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {list.length === 0 && (
          <p className="py-24 text-center text-muted-foreground">No products match your filters.</p>
        )}
      </section>
    </>
  );
}
