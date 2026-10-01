"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, MessageCircle, Phone, X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import type { NavigationData } from "@/lib/api/navigation";
import { whatsAppLink } from "@/lib/format";
import { SHOWROOM_PHONE, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { cn } from "@/lib/utils";
import { TOOL_LINKS } from "./HeaderBar";

/**
 * Full-screen mobile navigation (§32).
 *
 * Materials are browsed as a drill-down rather than a long accordion: tapping
 * a category replaces the list with its children, which keeps every level one
 * thumb-height tall on a phone.
 */
/** A list the drawer slides into: a category's children, or a floor family. */
type DrillIn = { title: string; allHref?: string; links: { name: string; href: string }[] };

export function MobileNav({
  navigation,
  onClose,
}: {
  navigation: NavigationData;
  onClose: () => void;
}) {
  const [drilledInto, setDrilledInto] = useState<DrillIn | null>(null);
  const [openSection, setOpenSection] = useState<"materials" | "rooms" | null>(null);

  // The page behind the drawer must not scroll while it is open.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background lg:hidden"
      role="dialog"
      aria-modal
      aria-label="Menu"
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-4">
        {drilledInto ? (
          <button
            type="button"
            onClick={() => setDrilledInto(null)}
            className="-ml-2 inline-flex h-11 items-center gap-1 px-2 font-display text-sm font-semibold uppercase tracking-[0.06em]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Menu
          </button>
        ) : (
          <Logo className="h-7 w-auto" />
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="-mr-2 grid h-11 w-11 place-items-center"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {drilledInto ? (
          <ul>
            {drilledInto.allHref && (
              <MobileRow href={drilledInto.allHref} onClose={onClose} emphasis>
                All {drilledInto.title}
              </MobileRow>
            )}
            {drilledInto.links.map((link) => (
              <MobileRow key={link.href} href={link.href} onClose={onClose}>
                {link.name}
              </MobileRow>
            ))}
          </ul>
        ) : (
          <>
            <div className="border-b border-border p-4">
              <p className="eyebrow">Popular floors</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {navigation.floors.map((floor) => (
                  <li key={floor.slug}>
                    {floor.children?.length ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDrilledInto({ title: floor.label, links: floor.children! })
                        }
                        className="flex h-12 w-full items-center justify-between rounded-md border border-border px-3 text-left text-sm font-semibold"
                      >
                        {floor.label}
                        <ChevronDown
                          className="h-4 w-4 -rotate-90 text-muted-foreground"
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <Link
                        href={floor.href}
                        onClick={onClose}
                        className="flex h-12 items-center rounded-md border border-border px-3 text-sm font-semibold transition active:bg-surface"
                      >
                        {floor.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <MobileSection
              title="All materials A–Z"
              isOpen={openSection === "materials"}
              onToggle={() => setOpenSection(openSection === "materials" ? null : "materials")}
            >
              <ul>
                {navigation.categories.map((category) =>
                  category.children && category.children.length > 0 ? (
                    <li key={category.slug} className="border-b border-border">
                      <button
                        type="button"
                        onClick={() =>
                          setDrilledInto({
                            title: category.name,
                            allHref: `/categories/${category.slug}`,
                            links: (category.children ?? []).map((child) => ({
                              name: child.name,
                              href: `/categories/${child.slug}`,
                            })),
                          })
                        }
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px]"
                      >
                        <span>{category.name}</span>
                        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                          <span className="font-mono text-xs">{category.children.length}</span>
                          <ChevronDown className="h-4 w-4 -rotate-90" aria-hidden />
                        </span>
                      </button>
                    </li>
                  ) : (
                    <MobileRow
                      key={category.slug}
                      href={`/categories/${category.slug}`}
                      onClose={onClose}
                    >
                      {category.name}
                    </MobileRow>
                  ),
                )}
              </ul>
            </MobileSection>

            <MobileSection
              title="Shop by room"
              isOpen={openSection === "rooms"}
              onToggle={() => setOpenSection(openSection === "rooms" ? null : "rooms")}
            >
              <ul className="grid grid-cols-2 gap-x-4 px-4 py-2">
                {navigation.rooms.map((room) => (
                  <li key={room.slug}>
                    <Link
                      href={`/rooms/${room.slug}`}
                      onClick={onClose}
                      className="block py-2.5 text-[15px]"
                    >
                      {room.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </MobileSection>

            <ul className="border-t border-border">
              {TOOL_LINKS.map((item) => (
                <MobileRow key={item.label} href={item.href} onClose={onClose} emphasis>
                  {item.label}
                </MobileRow>
              ))}
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
                  WHATSAPP_NUMBER,
                  "Hello Floor Nigeria, I would like a flooring quote.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center gap-2 border border-border px-4 text-sm"
              >
                <MessageCircle className="h-4 w-4 text-gold" aria-hidden />
                Chat on WhatsApp
              </a>
              <p className="pt-2 text-xs text-muted-foreground">
                Showrooms in Lekki, Ikeja and Abuja · Free site survey across Lagos
              </p>
            </div>
          </>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-4">
        <Link
          href="/account"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center border border-border font-display text-[13px] font-semibold uppercase tracking-[0.06em]"
        >
          Account
        </Link>
        <Link
          href="/contact"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center bg-charcoal-dark font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-primary-foreground"
        >
          Get a Quote
        </Link>
      </div>
    </div>
  );
}

function MobileSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex h-14 w-full items-center justify-between px-4 font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>
      {isOpen && children}
    </section>
  );
}

function MobileRow({
  href,
  children,
  onClose,
  emphasis = false,
}: {
  href: string;
  children: React.ReactNode;
  onClose: () => void;
  emphasis?: boolean;
}) {
  return (
    <li className="border-b border-border">
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex min-h-14 items-center px-4 py-3 text-[15px]",
          emphasis && "font-display font-semibold uppercase tracking-[0.06em]",
        )}
      >
        {children}
      </Link>
    </li>
  );
}
