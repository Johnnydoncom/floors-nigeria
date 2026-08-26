"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Taxonomy } from "@/lib/api/types";
import type { NavigationData } from "@/lib/api/navigation";

const CATEGORY_COLUMNS = 4;
const CHILDREN_PER_COLUMN = 5;

/**
 * The materials menu: the real category tree, parents as headings and their
 * children beneath, so a visitor reaches any of the ~46 categories in one
 * move rather than drilling through pages (§5, §6).
 */
export function CategoryMenu({
  navigation,
  onNavigate,
}: {
  navigation: NavigationData;
  onNavigate: () => void;
}) {
  const { categories, collections } = navigation;
  const featured = collections[0];
  const columns = categories.slice(0, CATEGORY_COLUMNS * 2);

  return (
    <MenuShell>
      <div className="col-span-9 grid grid-cols-4 gap-x-8 gap-y-7">
        {columns.map((category) => (
          <div key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              onClick={onNavigate}
              className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] transition hover:text-gold"
            >
              {category.name}
            </Link>

            {category.children && category.children.length > 0 && (
              <ul className="mt-3 space-y-2">
                {category.children.slice(0, CHILDREN_PER_COLUMN).map((child) => (
                  <MenuLink
                    key={child.slug}
                    href={`/categories/${child.slug}`}
                    onNavigate={onNavigate}
                  >
                    {child.name}
                  </MenuLink>
                ))}
                {category.children.length > CHILDREN_PER_COLUMN && (
                  <MenuLink href={`/categories/${category.slug}`} onNavigate={onNavigate} subdued>
                    View all {category.children.length}
                  </MenuLink>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="col-span-3">
        {featured ? (
          <FeatureTile
            href={`/collections/${featured.slug}`}
            imageUrl={featured.image_url}
            eyebrow="Collection"
            title={featured.name}
            description={featured.description}
            onNavigate={onNavigate}
          />
        ) : (
          <FeatureTile
            href="/visualizer"
            imageUrl={null}
            eyebrow="Free tool"
            title="See it in your room"
            description="Upload a photo and preview any floor in your own space before you buy."
            onNavigate={onNavigate}
          />
        )}

        <Link
          href="/products"
          onClick={onNavigate}
          className="mt-4 inline-flex h-11 w-full items-center justify-center border border-charcoal-dark text-[13px] font-semibold uppercase tracking-[0.08em] transition hover:bg-charcoal-dark hover:text-primary-foreground"
        >
          Browse all products
        </Link>
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
      <div className="relative aspect-square overflow-hidden bg-muted">
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
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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
