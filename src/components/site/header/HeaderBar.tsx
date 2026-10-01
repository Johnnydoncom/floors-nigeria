"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, Sparkles, User } from "lucide-react";
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

type Panel = "categories" | "rooms" | `floor:${string}`;

export type NavItem = { label: string; href: string };

/**
 * Pages that are not a floor: planning tools and the company. The header
 * gives its bar to the floors themselves, so these live in the utility strip
 * on desktop and in the drawer on mobile.
 */
export const TOOL_LINKS: NavItem[] = [
  { label: "Room Visualizer", href: "/visualizer" },
  { label: "Room Designer", href: "/room-designer" },
  { label: "Floor Calculator", href: "/calculator" },
  { label: "Installation", href: "/industries" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

/**
 * Floors beyond this many only show from `xl`, so the bar never wraps on a
 * small laptop. Every floor is still one click away in "All Flooring".
 */
const FLOORS_AT_LG = 6;

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
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
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

  const openMega = (panel: Panel | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenPanel(panel);
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-muted lg:hidden"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>

          <Link
            href="/account"
            className="hidden h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:bg-muted lg:inline-flex"
          >
            <User className="h-4 w-4" aria-hidden />
            Account
          </Link>

          <button
            type="button"
            aria-label={`Quote list, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
            onClick={() => cart.setOpen(true)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-muted"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {cart.count > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-mono text-[10px] font-semibold text-charcoal-dark">
                {cart.count}
              </span>
            )}
          </button>

          <Link href="/contact" className="btn btn-primary ml-2 hidden h-11 px-5 md:inline-flex">
            Get a quote
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-muted lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>

      {/* Navigation row: the floors themselves, linked to their category pages */}
      <nav
        aria-label="Main"
        onMouseLeave={scheduleMegaClose}
        className="hidden border-t border-border lg:block"
      >
        <div className="container-fluid flex items-center">
          <NavLink
            href="/products"
            isActive={isActive("/products")}
            isOpen={openPanel === "categories"}
            hasPanel
            onOpen={() => openMega("categories")}
            className="pl-0 pr-5 text-foreground"
            underlineClassName="left-0 right-5"
          >
            All Flooring
          </NavLink>

          <span className="mr-1 h-5 w-px bg-border" aria-hidden />

          {navigation.floors.map((floor, index) => {
            const panel: Panel = `floor:${floor.slug}`;
            const hasDropdown = Boolean(floor.children?.length);

            return (
              <div
                key={floor.slug}
                className={cn("relative", index >= FLOORS_AT_LG && "hidden xl:block")}
              >
                <NavLink
                  href={floor.href}
                  isActive={isActive(floor.href)}
                  isOpen={openPanel === panel}
                  hasPanel={hasDropdown}
                  onOpen={() => openMega(hasDropdown ? panel : null)}
                  className="px-3 2xl:px-4"
                  underlineClassName="inset-x-3 2xl:inset-x-4"
                >
                  {floor.label}
                </NavLink>

                {hasDropdown && openPanel === panel && (
                  <div
                    onMouseEnter={() => openMega(panel)}
                    className="absolute left-0 top-full z-10 w-64 rounded-b-lg border border-t-0 border-border bg-background p-2 shadow-luxe"
                  >
                    <ul>
                      {floor.children!.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpenPanel(null)}
                            className="block rounded-md px-3 py-2 text-sm transition hover:bg-surface hover:text-gold"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          <div className="ml-auto flex items-center">
            <NavLink
              href="/products"
              isActive={pathname.startsWith("/rooms/")}
              isOpen={openPanel === "rooms"}
              hasPanel
              onOpen={() => openMega("rooms")}
              className="px-3 2xl:px-4"
              underlineClassName="inset-x-3 2xl:inset-x-4"
            >
              Rooms
            </NavLink>
            <Link
              href="/visualizer"
              onMouseEnter={() => openMega(null)}
              aria-current={isActive("/visualizer") ? "page" : undefined}
              className="ml-2 inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold/12 px-3.5 font-display text-[13px] font-semibold text-foreground transition hover:bg-gold hover:text-charcoal-dark"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
              Visualizer
            </Link>
          </div>
        </div>

        {(openPanel === "categories" || openPanel === "rooms") && (
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

/**
 * One item in the navigation bar. Hover or focus opens its panel, and the
 * gold rule marks the open panel or the current section.
 */
function NavLink({
  href,
  isActive,
  isOpen,
  hasPanel = false,
  onOpen,
  className,
  underlineClassName,
  children,
}: {
  href: string;
  isActive: boolean;
  isOpen: boolean;
  hasPanel?: boolean;
  onOpen: () => void;
  className?: string;
  underlineClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onOpen}
      onFocus={onOpen}
      aria-expanded={hasPanel ? isOpen : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-12 items-center gap-1 whitespace-nowrap font-display text-[13.5px] font-semibold text-foreground/70 transition-colors hover:text-foreground",
        (isActive || isOpen) && "text-foreground",
        className,
      )}
    >
      {children}
      {hasPanel && (
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "absolute bottom-0 h-0.5 origin-left bg-gold transition-transform",
          underlineClassName,
          isOpen || isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}
