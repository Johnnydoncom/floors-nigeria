import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, X, Sparkles, Phone, MapPin, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";

const nav = [
  { label: "Products", to: "/products" },
  { label: "Collections", to: "/collections" },
  { label: "Industries", to: "/industries" },
  { label: "Projects", to: "/projects" },
  { label: "AI Studio", to: "/visualizer" },
  { label: "Journal", to: "/blog" },
  { label: "About", to: "/about" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background shadow-[0_1px_0_0_var(--border)]">
      {/* Utility bar */}
      <div className="hidden md:block bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid flex h-9 items-center justify-between text-[11px] font-mono uppercase tracking-[0.16em]">
          <div className="flex items-center gap-6 text-primary-foreground/75">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gold-light" /> Lagos · Abuja · Port Harcourt</span>
            <a href="tel:+2348000000000" className="inline-flex items-center gap-1.5 hover:text-gold-light transition">
              <Phone className="h-3 w-3 text-gold-light" /> +234 800 000 0000
            </a>
          </div>
          <div className="flex items-center gap-5 text-primary-foreground/75">
            <Link to="/industries" className="hover:text-gold-light transition">Trade & Specifiers</Link>
            <Link to="/calculator" className="hover:text-gold-light transition">Floor Calculator</Link>
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

        <nav className="hidden lg:flex items-center h-full">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="relative h-full px-4 inline-flex items-center whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70 hover:text-foreground transition-colors group"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
              <span className="absolute inset-x-3 bottom-0 h-[3px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button aria-label="Search" className="hidden md:inline-flex h-10 w-10 items-center justify-center hover:bg-muted transition">
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/visualizer"
            className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 hover:bg-muted transition text-sm font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            AI
          </Link>
          <button aria-label="Samples cart" className="hidden md:inline-flex h-10 w-10 items-center justify-center hover:bg-muted transition">
            <ShoppingBag className="h-4 w-4" />
          </button>
          <Link
            to="/contact"
            className="hidden md:inline-flex ml-2 h-11 items-center bg-charcoal-dark px-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-gold hover:text-charcoal-dark transition"
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

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden bg-background border-b border-border max-h-[80svh] overflow-y-auto">
          <div className="container-fluid py-5 flex flex-col">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-3.5 text-base font-semibold uppercase tracking-[0.06em] text-foreground border-b border-border/60 flex items-center justify-between"
              >
                {n.label}
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex justify-center h-12 items-center bg-charcoal-dark text-primary-foreground font-semibold uppercase tracking-[0.08em] text-sm"
            >
              Get a Quote
            </Link>
            <a href="tel:+2348000000000" className="mt-3 inline-flex justify-center h-12 items-center border border-border font-semibold text-sm gap-2">
              <Phone className="h-4 w-4 text-gold" /> +234 800 000 0000
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
