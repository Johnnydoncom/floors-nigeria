"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NavigationData } from "@/lib/api/navigation";

/**
 * The materials menu.
 *
 * A flooring customer shops by material first, then by room, so the menu leads
 * with photographed category tiles and follows with room and look shortcuts —
 * a digital sample library rather than a list of links (§6, §32).
 */
export function MegaMenu({
  navigation,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
}: {
  navigation: NavigationData;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: () => void;
}) {
  const { categories, collections, rooms, looks } = navigation;
  const featured = collections[0];

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute inset-x-0 top-full hidden border-b border-border bg-background shadow-luxe lg:block"
    >
      <div className="container-fluid grid grid-cols-12 gap-10 py-10">
        <div className="col-span-7">
          <MenuHeading>Shop by material</MenuHeading>

          <div className="mt-5 grid grid-cols-3 gap-4">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={`/products?categories=${category.slug}`}
                onClick={onNavigate}
                className="group"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-muted">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt=""
                      fill
                      sizes="220px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-muted),var(--color-surface))]" />
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t-2 border-charcoal-dark pt-2 transition-colors group-hover:border-gold">
                  <span className="font-display text-[15px] tracking-tight">{category.name}</span>
                  {category.products_count !== undefined && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {category.products_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-8">
          <div>
            <MenuHeading>Shop by room</MenuHeading>
            <ul className="mt-4 space-y-2.5">
              {rooms.slice(0, 6).map((room) => (
                <MenuLink
                  key={room.slug}
                  href={`/products?taxonomies=${room.slug}`}
                  onNavigate={onNavigate}
                >
                  {room.name}
                </MenuLink>
              ))}
            </ul>
          </div>

          <div>
            <MenuHeading>Shop by look</MenuHeading>
            <ul className="mt-4 space-y-2.5">
              {looks.slice(0, 5).map((look) => (
                <MenuLink
                  key={look.slug}
                  href={`/products?taxonomies=${look.slug}`}
                  onNavigate={onNavigate}
                >
                  {look.name}
                </MenuLink>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-3">
          <MenuHeading>Plan your floor</MenuHeading>
          <ul className="mt-4 space-y-2.5">
            <MenuLink href="/visualizer" onNavigate={onNavigate}>
              See it in your room
            </MenuLink>
            <MenuLink href="/calculator" onNavigate={onNavigate}>
              Floor calculator
            </MenuLink>
            <MenuLink href="/contact" onNavigate={onNavigate}>
              Book a site survey
            </MenuLink>
            <MenuLink href="/products?availability=in_stock" onNavigate={onNavigate}>
              In stock now
            </MenuLink>
          </ul>

          {featured && (
            <Link
              href={`/collections/${featured.slug}`}
              onClick={onNavigate}
              className="group mt-6 block"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {featured.image_url && (
                  <Image
                    src={featured.image_url}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
                  Collection
                </span>
              </div>
              <div className="mt-3 font-display text-lg">{featured.name}</div>
              {featured.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{featured.description}</p>
              )}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{children}</h2>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="group inline-flex items-center gap-1.5 text-[15px] text-foreground/80 transition hover:text-foreground"
      >
        {children}
        <ArrowRight
          className="h-3.5 w-3.5 -translate-x-1 text-gold opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden
        />
      </Link>
    </li>
  );
}
