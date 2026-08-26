"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageCircle, Phone, X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import type { NavigationData } from "@/lib/api/navigation";
import { whatsAppLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NavItem } from "./HeaderBar";

const SHOWROOM_PHONE = "+2348000000000";

/**
 * Full-screen mobile navigation (§32): thumb-friendly targets, materials
 * behind one tap, and the two calls to action always in reach.
 */
export function MobileNav({
  navigation,
  navItems,
  onClose,
}: {
  navigation: NavigationData;
  navItems: NavItem[];
  onClose: () => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>("Flooring");

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background lg:hidden"
      role="dialog"
      aria-modal
      aria-label="Menu"
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-4">
        <Logo className="h-7 w-auto" />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="grid h-10 w-10 place-items-center"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav aria-label="Mobile" className="flex-1 overflow-y-auto">
        <ul>
          {navItems.map((item) =>
            item.hasMegaMenu ? (
              <li key={item.href} className="border-b border-border">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSection((current) => (current === item.label ? null : item.label))
                  }
                  aria-expanded={openSection === item.label}
                  className="flex h-14 w-full items-center justify-between px-4 text-left text-base font-semibold uppercase tracking-[0.06em]"
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSection === item.label && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>

                {openSection === item.label && (
                  <div className="space-y-6 bg-surface px-4 pb-6 pt-2">
                    <MobileGroup
                      title="Shop by material"
                      links={navigation.categories.map((category) => ({
                        label: category.name,
                        href: `/products?categories=${category.slug}`,
                      }))}
                      onNavigate={onClose}
                    />
                    <MobileGroup
                      title="Shop by room"
                      links={navigation.rooms.slice(0, 6).map((room) => ({
                        label: room.name,
                        href: `/products?taxonomies=${room.slug}`,
                      }))}
                      onNavigate={onClose}
                    />
                  </div>
                )}
              </li>
            ) : (
              <li key={item.href} className="border-b border-border">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex h-14 items-center px-4 text-base font-semibold uppercase tracking-[0.06em]"
                >
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        <div className="space-y-3 p-4">
          <a
            href={`tel:${SHOWROOM_PHONE}`}
            className="flex h-12 items-center gap-2 border border-border px-4 text-sm"
          >
            <Phone className="h-4 w-4 text-gold" aria-hidden />
            {SHOWROOM_PHONE}
          </a>
          <a
            href={whatsAppLink(
              SHOWROOM_PHONE,
              "Hello Floor Nigeria, I would like a flooring quote.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center gap-2 border border-border px-4 text-sm"
          >
            <MessageCircle className="h-4 w-4 text-gold" aria-hidden />
            Chat on WhatsApp
          </a>
        </div>
      </nav>

      <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-4">
        <Link
          href="/visualizer"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center border border-border text-sm font-semibold uppercase tracking-[0.06em]"
        >
          Visualise
        </Link>
        <Link
          href="/contact"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center bg-charcoal-dark text-sm font-semibold uppercase tracking-[0.06em] text-primary-foreground"
        >
          Get a quote
        </Link>
      </div>
    </div>
  );
}

function MobileGroup({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: { label: string; href: string }[];
  onNavigate: () => void;
}) {
  if (links.length === 0) return null;

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{title}</p>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={onNavigate} className="block py-1 text-[15px]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
