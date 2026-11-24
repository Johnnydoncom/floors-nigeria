import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { getCategories } from "@/lib/api/catalog";
import { resolveFloorFamilies, type FloorLink } from "@/lib/floor-families";
import { fromPrice } from "@/lib/home/prices";
import { cn } from "@/lib/utils";

/** Floors given a photograph; the rest of the range follows as links. */
const PICTURED = 4;

/**
 * "What are you flooring?" — the floors in order of demand, each with how many
 * products it has and what it starts at, then a way in for the undecided.
 */
export async function FloorBento() {
  const families = resolveFloorFamilies(await getCategories());
  const pictured = families.slice(0, PICTURED);
  const rest = families.slice(PICTURED);
  const prices = await Promise.all(pictured.map((family) => fromPrice([family.slug])));
  // The large tile needs three beside it; with fewer floors every tile is equal.
  const bento = pictured.length === PICTURED;

  return (
    <section aria-labelledby="home-floors" className="container-fluid py-12 md:py-24">
      <SectionHeader
        id="home-floors"
        title="What are you flooring?"
        lead="Every floor we sell is supplied from our own warehouses and laid by our own crews."
        action={{ label: "Browse all floors", href: "/products" }}
      />

      <div
        className={cn(
          "mt-10 grid grid-cols-2 gap-3",
          bento ? "lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(15rem,1fr))]" : "lg:grid-cols-3",
        )}
      >
        {pictured.map((family, position) => (
          <FloorTile
            key={family.slug}
            family={family}
            price={prices[position]}
            large={bento && position === 0}
            className={cn(bento && position === 0 && "col-span-2 lg:row-span-2")}
          />
        ))}

        <Link
          href="/floor-finder"
          className="group col-span-2 flex min-h-[12rem] flex-col justify-between rounded-lg bg-charcoal p-6 sm:col-span-1 sm:min-h-[15rem] text-primary-foreground transition hover:bg-charcoal-dark"
        >
          <Compass className="h-7 w-7 text-gold-light" aria-hidden />
          <span>
            <span className="block font-display text-xl font-semibold leading-snug">
              Not sure which floor suits your room?
            </span>
            <span className="mt-2 block text-sm text-primary-foreground/70">
              Answer five quick questions and we&apos;ll suggest three floors that fit.
            </span>
            <span className="mt-5 inline-flex items-center gap-2 font-display text-sm font-semibold text-gold-light">
              Find my floor
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </span>
        </Link>
      </div>

      {rest.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">Also in stock:</span>
          {rest.map((family) => (
            <Link
              key={family.slug}
              href={family.href}
              className="rounded-full border border-border px-4 py-2 font-display text-sm font-medium transition hover:border-foreground"
            >
              {family.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function FloorTile({
  family,
  price,
  large,
  className,
}: {
  family: FloorLink;
  price: string | null;
  large: boolean;
  className?: string;
}) {
  const count = family.productCount ?? 0;

  return (
    <Link
      href={family.href}
      className={cn(
        "group relative isolate flex min-h-[13rem] flex-col justify-end overflow-hidden rounded-lg bg-muted p-4 text-primary-foreground sm:min-h-[15rem] sm:p-5 md:p-6",
        className,
      )}
    >
      <Image
        src={family.image}
        alt=""
        fill
        sizes={
          large
            ? "(min-width: 1024px) 50vw, (min-width: 640px) 100vw, 100vw"
            : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        }
        className="-z-10 object-cover transition duration-700 group-hover:scale-[1.04]"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal-dark/85 via-charcoal-dark/25 to-transparent"
      />

      <span
        className={cn(
          "font-display font-semibold leading-tight tracking-tight",
          large ? "text-3xl md:text-4xl" : "text-lg sm:text-xl",
        )}
      >
        {family.name}
      </span>
      <span
        className={cn(
          "mt-1 text-primary-foreground/75",
          large ? "text-base" : "text-sm max-sm:hidden",
        )}
      >
        {family.tagline}
      </span>
      {(price || count > 0) && (
        <span className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-primary-foreground/20 pt-3 text-sm">
          {price && <span className="font-display font-semibold text-gold-light">{price}</span>}
          {count > 0 && (
            <span className="text-primary-foreground/70">
              {count} {count === 1 ? "product" : "products"}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
