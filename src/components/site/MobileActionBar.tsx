"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LayoutGrid, Phone, ShoppingBag, Sparkles } from "lucide-react";
import WhatsAppIcon from "@/components/catalog/WhatsAppIcon";
import { useCart } from "@/lib/cart";
import { whatsAppLink } from "@/lib/format";
import { SHOWROOM_PHONE, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { cn } from "@/lib/utils";

/** Pages with their own controls along the bottom of the screen. */
const HIDDEN_ON = ["/visualizer", "/room-designer", "/cart", "/checkout"];

/** Height of the bar above the safe area, kept in step with its classes. */
const BAR_HEIGHT = "4rem";

/**
 * The phone's tab bar, as in an app: shop, the visualizer, WhatsApp, a call
 * and the cart, one thumb away and always in the same place on every page.
 *
 * It publishes its height as `--mobile-bar-offset` on <html>, so other
 * floating controls (the chat launcher) sit above it.
 */
export function MobileActionBar() {
  const pathname = usePathname();
  const cart = useCart();

  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // Let the chat launcher and other floating controls clear the bar.
  useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia("(max-width: 1023px)");
    const apply = () =>
      root.style.setProperty(
        "--mobile-bar-offset",
        !hidden && phone.matches ? `calc(${BAR_HEIGHT} + env(safe-area-inset-bottom))` : "0px",
      );
    apply();
    phone.addEventListener("change", apply);
    return () => {
      phone.removeEventListener("change", apply);
      root.style.setProperty("--mobile-bar-offset", "0px");
    };
  }, [hidden]);

  if (hidden) return null;

  const isShop = ["/products", "/product", "/categories", "/collections", "/rooms"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_oklch(0.2_0.01_90/0.25)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 items-stretch">
        <li>
          <BarLink
            href="/products"
            label="Shop"
            active={isShop}
            icon={<LayoutGrid className="h-5 w-5" aria-hidden />}
          />
        </li>
        <li>
          <BarLink
            href="/visualizer"
            label="Visualizer"
            icon={<Sparkles className="h-5 w-5" aria-hidden />}
          />
        </li>
        <li className="relative">
          <a
            href={whatsAppLink(
              WHATSAPP_NUMBER,
              "Hello Floor Nigeria, I would like a flooring quote.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full flex-col items-center justify-end pb-1.5 text-[11px] font-semibold"
          >
            <span className="absolute -top-5 grid h-14 w-14 place-items-center rounded-full bg-[#1DAA53] text-white shadow-lg ring-4 ring-background transition group-active:scale-95">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            WhatsApp
          </a>
        </li>
        <li>
          <BarLink
            href={`tel:${SHOWROOM_PHONE}`}
            label="Call"
            external
            icon={<Phone className="h-5 w-5" aria-hidden />}
          />
        </li>
        <li>
          <button
            type="button"
            onClick={() => cart.setOpen(true)}
            aria-label={`Cart, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition active:text-foreground"
          >
            <span className="relative">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {cart.ready && cart.count > 0 && (
                <span className="absolute -right-2.5 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-charcoal-dark">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              )}
            </span>
            Cart
          </button>
        </li>
      </ul>
    </nav>
  );
}

function BarLink({
  href,
  label,
  icon,
  active = false,
  external = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  external?: boolean;
}) {
  const className = cn(
    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
    active ? "text-foreground" : "text-muted-foreground active:text-foreground",
  );
  const content = (
    <>
      <span className={cn("relative", active && "text-gold")}>{icon}</span>
      {label}
    </>
  );

  return external ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
