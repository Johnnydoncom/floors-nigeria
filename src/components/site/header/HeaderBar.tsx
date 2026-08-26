"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/lib/cart";
import type { NavigationData } from "@/lib/api/navigation";
import { CartDrawer } from "./CartDrawer";
import { MegaMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";
import { SearchOverlay } from "./SearchOverlay";
import { cn } from "@/lib/utils";

const MEGA_CLOSE_DELAY_MS = 140;

export type NavItem = { label: string; href: string; hasMegaMenu?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Flooring", href: "/products", hasMegaMenu: true },
  { label: "Collections", href: "/collections" },
  { label: "Room Visualizer", href: "/visualizer" },
  { label: "Installation", href: "/industries" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

/**
 * The interactive header shell: navigation with a materials mega menu, search,
 * quote list and the primary conversion CTA.
 */
export function HeaderBar({ navigation }: { navigation: NavigationData }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cmd/Ctrl-K opens search; Escape closes whatever is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsMegaOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Any navigation closes the menus. Adjusted during render rather than in an
  // effect, so the menu never paints once more on the new route first.
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMegaOpen(false);
    setIsMobileNavOpen(false);
  }

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsMegaOpen(true);
  };

  const scheduleMegaClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsMegaOpen(false), MEGA_CLOSE_DELAY_MS);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div
        className={cn(
          "container-fluid flex items-center justify-between gap-6 border-b border-border transition-all duration-300",
          isScrolled ? "h-16" : "h-[72px] md:h-20",
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Floor Nigeria home">
          <Logo className="h-7 w-auto md:h-9" />
        </Link>

        <nav
          aria-label="Main"
          className="hidden h-full items-center lg:flex"
          onMouseLeave={scheduleMegaClose}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => (item.hasMegaMenu ? openMega() : setIsMegaOpen(false))}
              onFocus={() => (item.hasMegaMenu ? openMega() : setIsMegaOpen(false))}
              aria-expanded={item.hasMegaMenu ? isMegaOpen : undefined}
              className={cn(
                "group relative inline-flex h-full items-center whitespace-nowrap px-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70 transition-colors hover:text-foreground",
                isActive(item.href) && "text-foreground",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-[3px] origin-left bg-gold transition-transform",
                  item.hasMegaMenu && isMegaOpen
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100",
                  isActive(item.href) && "scale-x-100",
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search the catalogue"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center transition hover:bg-muted"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>

          <Link
            href="/visualizer"
            className="hidden h-10 items-center gap-1.5 px-3 text-sm font-medium transition hover:bg-muted md:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
            Visualise
          </Link>

          <Link
            href="/account"
            aria-label="My account"
            className="hidden h-10 w-10 items-center justify-center transition hover:bg-muted md:inline-flex"
          >
            <User className="h-4 w-4" aria-hidden />
          </Link>

          <button
            type="button"
            aria-label={`Quote list, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
            onClick={() => cart.setOpen(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center transition hover:bg-muted"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {cart.count > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-mono text-[10px] text-charcoal-dark">
                {cart.count}
              </span>
            )}
          </button>

          <Link
            href="/contact"
            className="ml-2 hidden h-11 items-center whitespace-nowrap bg-charcoal-dark px-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark md:inline-flex xl:px-6"
          >
            Request a quote
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center transition hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {isMegaOpen && (
        <MegaMenu
          navigation={navigation}
          onMouseEnter={openMega}
          onMouseLeave={scheduleMegaClose}
          onNavigate={() => setIsMegaOpen(false)}
        />
      )}

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}

      {isMobileNavOpen && (
        <MobileNav
          navigation={navigation}
          navItems={NAV_ITEMS}
          onClose={() => setIsMobileNavOpen(false)}
        />
      )}
      <CartDrawer />
    </>
  );
}
