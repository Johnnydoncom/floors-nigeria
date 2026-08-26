"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/lib/cart";
import type { NavigationData } from "@/lib/api/navigation";
import { cn } from "@/lib/utils";
import { CartDrawer } from "./CartDrawer";
import { HeaderSearch } from "./HeaderSearch";
import { CategoryMenu, RoomMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";
import { SearchOverlay } from "./SearchOverlay";

const MEGA_CLOSE_DELAY_MS = 160;

export type NavItem = {
  label: string;
  href: string;
  /** Which mega panel this item opens, if any. */
  panel?: "categories" | "rooms";
};

/**
 * One entry per destination — the visualizer is a navigation item, not also a
 * toolbar button, so nothing appears twice.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Shop Flooring", href: "/products", panel: "categories" },
  { label: "Shop by Room", href: "/products", panel: "rooms" },
  { label: "Room Visualizer", href: "/visualizer" },
  { label: "Floor Calculator", href: "/calculator" },
  { label: "Installation", href: "/industries" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

/**
 * The interactive header.
 *
 * Desktop reads top to bottom as brand → find → browse: a logo and search row,
 * then a dedicated navigation row whose materials and rooms panels are built
 * from the live catalogue. Below `lg` it collapses to a single row of
 * touch-sized targets and a full-screen drawer (§32).
 */
export function HeaderBar({ navigation }: { navigation: NavigationData }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openPanel, setOpenPanel] = useState<NavItem["panel"] | null>(null);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPanel(null);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Navigating closes every menu. Adjusted during render rather than in an
  // effect, so a panel never paints once more on the new route first.
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenPanel(null);
    setIsMobileNavOpen(false);
  }

  const openMega = (panel: NavItem["panel"]) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenPanel(panel ?? null);
  };

  const scheduleMegaClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenPanel(null), MEGA_CLOSE_DELAY_MS);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Brand, search and account row */}
      <div
        className={cn(
          "container-fluid flex items-center gap-4 transition-all duration-300 lg:gap-8",
          isScrolled ? "h-16" : "h-[68px] md:h-20",
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Floor Nigeria home">
          <Logo className="h-7 w-auto md:h-9" />
        </Link>

        <HeaderSearch className="hidden max-w-xl flex-1 lg:block" />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Search the catalogue"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center transition hover:bg-muted lg:hidden"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>

          <Link
            href="/account"
            className="hidden h-11 items-center gap-2 px-3 text-sm font-semibold transition hover:bg-muted lg:inline-flex"
          >
            <User className="h-4 w-4" aria-hidden />
            Account
          </Link>

          <button
            type="button"
            aria-label={`Quote list, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
            onClick={() => cart.setOpen(true)}
            className="relative inline-flex h-11 w-11 items-center justify-center transition hover:bg-muted"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {cart.count > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-mono text-[10px] font-semibold text-charcoal-dark">
                {cart.count}
              </span>
            )}
          </button>

          <Link
            href="/contact"
            className="ml-1 hidden h-11 items-center whitespace-nowrap bg-charcoal-dark px-5 font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark md:inline-flex"
          >
            Get a Quote
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-11 w-11 items-center justify-center transition hover:bg-muted lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>

      {/* Navigation row */}
      <nav
        aria-label="Main"
        onMouseLeave={scheduleMegaClose}
        className="hidden border-y border-border lg:block"
      >
        <div className="container-fluid flex items-center">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => openMega(item.panel)}
              onFocus={() => openMega(item.panel)}
              aria-expanded={item.panel ? openPanel === item.panel : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "group relative inline-flex h-12 items-center gap-1 whitespace-nowrap px-4 font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-foreground/75 transition-colors first:pl-0 hover:text-foreground",
                (isActive(item.href) || openPanel === item.panel) && "text-foreground",
              )}
            >
              {item.label}
              {item.panel && (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    openPanel === item.panel && "rotate-180",
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "absolute inset-x-4 bottom-0 h-[3px] origin-left bg-gold transition-transform",
                  openPanel === item.panel ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </Link>
          ))}
        </div>

        {openPanel && (
          <div
            onMouseEnter={() => openMega(openPanel)}
            className="absolute inset-x-0 top-full border-b border-border bg-background shadow-luxe"
          >
            {openPanel === "categories" ? (
              <CategoryMenu navigation={navigation} onNavigate={() => setOpenPanel(null)} />
            ) : (
              <RoomMenu navigation={navigation} onNavigate={() => setOpenPanel(null)} />
            )}
          </div>
        )}
      </nav>

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}

      {isMobileNavOpen && (
        <MobileNav navigation={navigation} onClose={() => setIsMobileNavOpen(false)} />
      )}

      <CartDrawer />
    </>
  );
}
