import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, X, Sparkles } from "lucide-react";
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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <div className="container-fluid flex h-16 md:h-20 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Floors NG home">
          <Logo className="h-7 md:h-8 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3.5 py-2 text-sm font-medium text-foreground/75 hover:text-foreground transition-colors relative group"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
              <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button aria-label="Search" className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition">
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/visualizer"
            className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-full hover:bg-muted transition text-sm font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            AI
          </Link>
          <button aria-label="Cart" className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition">
            <ShoppingBag className="h-4 w-4" />
          </button>
          <Link
            to="/contact"
            className="hidden md:inline-flex ml-2 h-10 items-center rounded-full bg-charcoal px-5 text-sm font-medium text-primary-foreground hover:bg-charcoal-dark transition"
          >
            Get a Quote
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted transition"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="container-fluid py-6 flex flex-col gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-3 text-lg font-display text-foreground border-b border-border/60"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex justify-center h-12 items-center rounded-full bg-charcoal text-primary-foreground font-medium"
            >
              Get a Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
