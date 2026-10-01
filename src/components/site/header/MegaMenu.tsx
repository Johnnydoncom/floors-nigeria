"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Taxonomy } from "@/lib/api/types";
import type { NavigationData } from "@/lib/api/navigation";

const LINKS_PER_GROUP = 7;

/**
 * The materials menu: every category, grouped by what a buyer is shopping
 * for (see `floor-families.ts`) rather than A–Z, so Vinyl and Laminate are
 * not buried under "Accessories" and "Aluminum Doormat Fabric" (§5, §6).
 */
export function CategoryMenu({
  navigation,
  onNavigate,
}: {
  navigation: NavigationData;
  onNavigate: () => void;
}) {
  const { groups, collections } = navigation;
  const featured = collections[0];

  return (
    <MenuShell>
      <div
        className="col-span-9 grid gap-x-8 gap-y-7"
        style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 5)}, minmax(0, 1fr))` }}
      >
        {groups.map((group) => (
          <div key={group.title}>
            <MenuHeading>{group.title}</MenuHeading>
            <ul className="mt-4 space-y-2.5">
              {group.links.slice(0, LINKS_PER_GROUP).map((link) => (
                <MenuLink key={link.href} href={link.href} onNavigate={onNavigate}>
                  {link.name}
                </MenuLink>
              ))}
              {group.links.length > LINKS_PER_GROUP && (
                <MenuLink href="/categories" onNavigate={onNavigate} subdued>
                  View all
                </MenuLink>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="col-span-3">
        {featured ? (
          <FeatureTile
            // Collections have a listing page but no detail route yet.
            href="/collections"
            imageUrl={featured.image_url}
            eyebrow="Collection"
            title={featured.name}
            description={featured.description}
            onNavigate={onNavigate}
          />
        ) : (
          <FeatureTile
            href="/visualizer"
            imageUrl="/images/ai-visualizer.jpg"
            eyebrow="Free tool"
            title="See it in your room"
            description="Upload a photo and preview any floor in your own space before you buy."
            onNavigate={onNavigate}
          />
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/products" onClick={onNavigate} className="btn btn-primary h-11 px-3">
            All products
          </Link>
          <Link href="/categories" onClick={onNavigate} className="btn btn-outline h-11 px-3">
            All categories
          </Link>
        </div>
      </div>
    </MenuShell>
  );
}

/**
 * Shop-by-room and shop-by-look, with the room imagery doing the selling.
 */
export function RoomMenu({
  navigation,
  onNavigate,
}: {
  navigation: NavigationData;
  onNavigate: () => void;
}) {
  const { rooms, looks } = navigation;

  return (
    <MenuShell>
      <div className="col-span-9">
        <MenuHeading>Shop by room</MenuHeading>
        <div className="mt-4 grid grid-cols-5 gap-4">
          {rooms.slice(0, 10).map((room) => (
            <RoomTile key={room.slug} room={room} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div className="col-span-3">
        <MenuHeading>Shop by look</MenuHeading>
        <ul className="mt-4 space-y-2.5">
          {looks.map((look) => (
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
    </MenuShell>
  );
}

function MenuShell({ children }: { children: React.ReactNode }) {
  return <div className="container-fluid grid grid-cols-12 gap-8 py-9">{children}</div>;
}

function RoomTile({ room, onNavigate }: { room: Taxonomy; onNavigate: () => void }) {
  return (
    <Link href={`/rooms/${room.slug}`} onClick={onNavigate} className="group">
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {room.image_url ? (
          <Image
            src={room.image_url}
            alt=""
            fill
            sizes="160px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-muted),var(--color-surface))]" />
        )}
      </div>
      <span className="mt-2 block text-sm transition group-hover:text-gold">{room.name}</span>
    </Link>
  );
}

function FeatureTile({
  href,
  imageUrl,
  eyebrow,
  title,
  description,
  onNavigate,
}: {
  href: string;
  imageUrl: string | null;
  eyebrow: string;
  title: string;
  description: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="320px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-charcoal-dark),var(--color-charcoal))]" />
        )}
        <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-charcoal-dark">
          {eyebrow}
        </span>
      </div>
      <p className="mt-3 font-display text-lg">{title}</p>
      {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
    </Link>
  );
}

function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
      {children}
    </h2>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
  subdued = false,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  subdued?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={
          subdued
            ? "group inline-flex items-center gap-1.5 text-sm text-gold"
            : "group inline-flex items-center gap-1.5 text-[15px] text-foreground/75 transition hover:text-foreground"
        }
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
