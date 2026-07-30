import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Heart, Share2, ShieldCheck, Truck, Sparkles, Star, Minus, Plus } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { PRODUCTS, getProduct, naira } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetails,
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product not found — Floors NG" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    return {
      meta: [
        { title: `${p.name} — Floors NG` },
        { name: "description", content: p.blurb },
        { property: "og:title", content: `${p.name} — Floors NG` },
        { property: "og:description", content: p.blurb },
        { property: "og:type", content: "product" },
      ],
    };
  },
});

function ProductDetails() {
  const { slug } = Route.useParams();
  const product = getProduct(slug)!;
  const [active, setActive] = useState(0);
  const [finish, setFinish] = useState(product.finishes[0]);
  const [qty, setQty] = useState(20);
  const cart = useCart();

  const related = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <>
      <section className="pt-28 md:pt-36 container-fluid">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-foreground">Products</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </section>

      <section className="container-fluid pt-8 pb-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden bg-muted shadow-luxe">
              <img src={product.gallery[active]} alt={product.name} className="h-full w-full object-cover" />
              {product.tag && (
                <span className="absolute top-4 left-4 bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
                  {product.tag}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative aspect-square overflow-hidden transition ${
                    active === i ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <Reveal delay={0.1}>
            <Link to="/products" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to catalogue
            </Link>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.24em] text-gold">
              {product.category} · {product.collection} Collection
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-gold text-gold" /> {product.rating}
              </span>
              <span className="text-muted-foreground">({product.reviews} reviews)</span>
            </div>
            <p className="mt-4 text-muted-foreground text-lg">{product.blurb}</p>

            <div className="mt-8 flex items-baseline gap-3">
              <span className="font-mono text-4xl">{naira(product.price)}</span>
              <span className="text-sm text-muted-foreground">/ m² excl. VAT</span>
            </div>

            <div className="mt-6">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Finish</div>
              <div className="flex flex-wrap gap-2">
                {product.finishes.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFinish(f)}
                    className={`h-10 px-4 text-sm border transition ${
                      finish === f ? "border-charcoal-dark bg-charcoal-dark text-primary-foreground" : "border-border hover:border-gold hover:text-gold"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Area required</div>
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center border border-border">
                  <button className="h-12 w-12 grid place-items-center" onClick={() => setQty((q) => Math.max(1, q - 5))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-20 text-center font-mono">{qty} m²</span>
                  <button className="h-12 w-12 grid place-items-center" onClick={() => setQty((q) => q + 5)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="font-mono text-lg">{naira(product.price * qty)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  cart.add({ slug: product.slug, name: product.name, img: product.img, finish, price: product.price, qty });
                  cart.setOpen(true);
                }}
                className="flex-1 min-w-[180px] h-12 inline-flex items-center justify-center bg-charcoal-dark text-primary-foreground px-6 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition"
              >
                Add to cart
              </button>
              <button
                onClick={() => {
                  cart.add({ slug: product.slug, name: `${product.name} — sample`, img: product.img, finish, price: 2500, qty: 1 });
                  toast.success("Sample added to cart");
                }}
                className="h-12 inline-flex items-center justify-center border border-border px-6 text-sm font-medium hover:border-gold hover:text-gold transition"
              >
                Order sample · ₦2,500
              </button>
              <button className="h-12 w-12 grid place-items-center border border-border hover:bg-muted"><Heart className="h-4 w-4" /></button>
              <button className="h-12 w-12 grid place-items-center border border-border hover:bg-muted"><Share2 className="h-4 w-4" /></button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: "25-yr warranty" },
                { icon: Truck, label: "Free delivery 500 m²+" },
                { icon: Sparkles, label: "AI Visualize" },
              ].map((f) => (
                <div key={f.label} className="border border-border p-4 text-center">
                  <f.icon className="h-4 w-4 mx-auto text-gold" />
                  <div className="mt-2 text-xs">{f.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-fluid py-16 border-t border-border">
        <div className="grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Specifications</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">Every detail, on record.</h2>
            <div className="mt-6 flex gap-2 flex-wrap">
              <button className="h-10 px-4 border border-border text-xs font-medium hover:bg-muted inline-flex items-center gap-2">
                <Download className="h-3.5 w-3.5" /> Tech sheet
              </button>
              <button className="h-10 px-4 border border-border text-xs font-medium hover:bg-muted inline-flex items-center gap-2">
                <Download className="h-3.5 w-3.5" /> Installation
              </button>
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            <dl className="divide-y divide-border border-y border-border">
              {product.specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 py-4 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="container-fluid py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">You may also love</h2>
          <Link to="/products" className="text-sm font-medium hover:text-gold">View all →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {related.map((p) => (
            <Link key={p.slug} to="/products/$slug" params={{ slug: p.slug }} className="group block">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
              </div>
              <div className="pt-3 flex items-center justify-between gap-2">
                <span className="font-display text-base truncate">{p.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{naira(p.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
