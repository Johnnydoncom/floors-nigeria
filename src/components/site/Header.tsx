import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  ShoppingBag,
  X,
  Sparkles,
  Phone,
  MapPin,
  ChevronDown,
  User,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { MEGA_MENU, naira, searchProducts } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const [mega, setMega] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cart = useCart();
  const navigate = useNavigate();
  const results = searchProducts(q);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        cart.setOpen(false);
        setMega(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart]);

  const openMega = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(null), 140);
  };

  const active = MEGA_MENU.find((m) => m.label === mega && m.columns);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background shadow-[0_1px_0_0_var(--border)]">
      {/* Utility bar */}
      <div className="hidden md:block bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid flex h-9 items-center justify-between text-[11px] font-mono uppercase tracking-[0.16em]">
          <div className="flex items-center gap-6 text-primary-foreground/75">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gold-light" /> Lagos · Abuja · Port Harcourt
            </span>
            <a href="tel:+2348000000000" className="inline-flex items-center gap-1.5 hover:text-gold-light transition">
              <Phone className="h-3 w-3 text-gold-light" /> +234 800 000 0000
            </a>
          </div>
          <div className="flex items-center gap-5 text-primary-foreground/75">
            <Link to="/industries" className="hover:text-gold-light transition">Trade & Specifiers</Link>
            <Link to="/calculator" className="hover:text-gold-light transition">Floor Calculator</Link>
            <Link to="/account" className="hover:text-gold-light transition">My Account</Link>
            <Link to="/contact" className="hover:text-gold-light transition">Book a Showroom Visit</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`container-fluid flex items-center justify-between gap-6 border-b border-border transition-all duration-300 ${
          scrolled ? "h-16" : "h-[72px] md:h-20"
        }`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Floors NG home">
          <Logo className="h-7 md:h-9 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center h-full" onMouseLeave={scheduleClose}>
          {MEGA_MENU.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onMouseEnter={() => (n.columns ? openMega(n.label) : setMega(null))}
              onFocus={() => (n.columns ? openMega(n.label) : setMega(null))}
              className="relative h-full px-4 inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70 hover:text-foreground transition-colors group"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
              {n.columns && (
                <ChevronDown className={`h-3 w-3 transition-transform ${mega === n.label ? "rotate-180" : ""}`} />
              )}
              <span
                className={`absolute inset-x-3 bottom-0 h-[3px] bg-gold origin-left transition-transform ${
                  mega === n.label ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="hidden md:inline-flex h-10 w-10 items-center justify-center hover:bg-muted transition"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/visualizer"
            className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 hover:bg-muted transition text-sm font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            AI
          </Link>
          <Link
            to="/account"
            aria-label="Account"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center hover:bg-muted transition"
          >
            <User className="h-4 w-4" />
          </Link>
          <button
            aria-label="Samples cart"
            onClick={() => cart.setOpen(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center hover:bg-muted transition"
          >
            <ShoppingBag className="h-4 w-4" />
            {cart.count > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-gold text-[10px] font-mono text-charcoal-dark">
                {cart.count}
              </span>
            )}
          </button>
          <Link
            to="/contact"
            className="hidden md:inline-flex ml-2 h-11 items-center whitespace-nowrap bg-charcoal-dark px-5 xl:px-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-gold hover:text-charcoal-dark transition"
          >
            Get a Quote
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="lg:hidden h-10 w-10 inline-flex items-center justify-center hover:bg-muted transition"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mega menu */}
      {active && (
        <div
          className="hidden lg:block absolute inset-x-0 top-full bg-background border-b border-border shadow-luxe"
          onMouseEnter={() => openMega(active.label)}
          onMouseLeave={scheduleClose}
        >
          <div className="container-fluid grid grid-cols-12 gap-10 py-10">
            {active.columns!.map((col) => (
              <div key={col.title} className="col-span-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{col.title}</div>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        onClick={() => setMega(null)}
                        className="group inline-flex items-center gap-1.5 text-[15px] text-foreground/80 hover:text-foreground transition"
                      >
                        {l.label}
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-gold" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {active.feature && (
              <Link
                to={active.feature.to}
                onClick={() => setMega(null)}
                className="col-span-3 group block"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={active.feature.img}
                    alt={active.feature.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="mt-3 font-display text-lg">{active.feature.title}</div>
                <div className="text-sm text-muted-foreground">{active.feature.text}</div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            className="absolute inset-0 bg-charcoal-dark/50 backdrop-blur-sm"
          />
          <div className="relative mx-auto mt-24 w-[min(46rem,92vw)] bg-background shadow-elevated">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchOpen(false);
                navigate({ to: "/products" });
              }}
              className="flex items-center gap-3 border-b border-border px-5"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search oak, SPC, marble, wall panels…"
                className="h-16 flex-1 bg-transparent outline-none text-lg"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </form>
            <div className="max-h-[50vh] overflow-y-auto">
              {q && results.length === 0 && (
                <p className="px-5 py-8 text-sm text-muted-foreground">No products match "{q}".</p>
              )}
              {results.map((p) => (
                <Link
                  key={p.slug}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  onClick={() => {
                    setSearchOpen(false);
                    setQ("");
                  }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted transition"
                >
                  <img src={p.img} alt="" className="h-12 w-12 object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category}</div>
                  </div>
                  <span className="font-mono text-xs">{naira(p.price)}/m²</span>
                </Link>
              ))}
              {!q && (
                <div className="px-5 py-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Popular</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Oak", "Herringbone", "SPC", "Marble", "Wall panels"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setQ(t)}
                        className="border border-border px-3 py-1.5 text-xs hover:border-gold hover:text-gold transition"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cart.open && (
        <div className="fixed inset-0 z-[60]">
          <button aria-label="Close cart" onClick={() => cart.setOpen(false)} className="absolute inset-0 bg-charcoal-dark/50" />
          <aside className="absolute right-0 top-0 h-full w-[min(28rem,94vw)] bg-background flex flex-col shadow-elevated">
            <div className="flex items-center justify-between border-b border-border px-5 h-16">
              <span className="font-display text-lg">Your cart ({cart.count})</span>
              <button onClick={() => cart.setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cart.items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Your cart is empty.
                  <Link to="/products" onClick={() => cart.setOpen(false)} className="mt-4 block text-gold font-medium">
                    Browse the catalogue →
                  </Link>
                </div>
              ) : (
                cart.items.map((i) => (
                  <div key={i.slug + i.finish} className="flex gap-4 border-b border-border p-5">
                    <img src={i.img} alt="" className="h-20 w-20 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <div className="truncate font-medium">{i.name}</div>
                        <button onClick={() => cart.remove(i.slug, i.finish)} aria-label="Remove">
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">{i.finish}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center border border-border">
                          <button className="h-8 w-8" onClick={() => cart.setQty(i.slug, i.finish, i.qty - 1)}>−</button>
                          <span className="w-14 text-center font-mono text-xs">{i.qty} m²</span>
                          <button className="h-8 w-8" onClick={() => cart.setQty(i.slug, i.finish, i.qty + 1)}>+</button>
                        </div>
                        <span className="font-mono text-sm">{naira(i.price * i.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                <span className="font-mono text-lg">{naira(cart.subtotal)}</span>
              </div>
              <Link
                to="/cart"
                onClick={() => cart.setOpen(false)}
                className="mt-4 flex h-12 items-center justify-center bg-charcoal-dark text-primary-foreground text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition"
              >
                View cart
              </Link>
              <Link
                to="/checkout"
                onClick={() => cart.setOpen(false)}
                className="mt-2 flex h-12 items-center justify-center border border-border text-sm font-semibold uppercase tracking-[0.08em] hover:border-gold hover:text-gold transition"
              >
                Checkout
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden bg-background border-b border-border max-h-[80svh] overflow-y-auto">
          <div className="container-fluid py-5 flex flex-col">
            <button
              onClick={() => {
                setOpen(false);
                setSearchOpen(true);
              }}
              className="mb-4 flex h-12 items-center gap-3 border border-border px-4 text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" /> Search products
            </button>
            {MEGA_MENU.map((n) => (
              <div key={n.label} className="border-b border-border/60">
                <div className="flex items-center justify-between">
                  <Link
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="py-3.5 text-base font-semibold uppercase tracking-[0.06em] text-foreground"
                  >
                    {n.label}
                  </Link>
                  {n.columns && (
                    <button
                      aria-label={`Toggle ${n.label}`}
                      onClick={() => setMobileSub((s) => (s === n.label ? null : n.label))}
                      className="h-10 w-10 grid place-items-center"
                    >
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${mobileSub === n.label ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {n.columns && mobileSub === n.label && (
                  <div className="pb-4 pl-1 grid gap-4">
                    {n.columns.map((c) => (
                      <div key={c.title}>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{c.title}</div>
                        <div className="mt-2 grid gap-1.5">
                          {c.links.map((l) => (
                            <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex justify-center h-12 items-center bg-charcoal-dark text-primary-foreground font-semibold uppercase tracking-[0.08em] text-sm"
            >
              Get a Quote
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link to="/account" onClick={() => setOpen(false)} className="h-12 inline-flex justify-center items-center border border-border text-sm font-semibold gap-2">
                <User className="h-4 w-4 text-gold" /> Account
              </Link>
              <a href="tel:+2348000000000" className="h-12 inline-flex justify-center items-center border border-border text-sm font-semibold gap-2">
                <Phone className="h-4 w-4 text-gold" /> Call us
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
