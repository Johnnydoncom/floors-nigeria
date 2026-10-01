import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A floor category as a photographic tile linking to its category page.
 * Server component: plain links, no JavaScript.
 */
export function FloorCard({
  href,
  name,
  tagline,
  image,
  productCount,
  sizes = "(min-width: 1024px) 33vw, 50vw",
  className,
}: {
  href: string;
  name: string;
  tagline?: string | null;
  image: string | null;
  productCount?: number | null;
  sizes?: string;
  className?: string;
}) {
  // An empty category says nothing useful; only real counts are shown.
  const hasCount = typeof productCount === "number" && productCount > 0;

  return (
    <Link
      href={href}
      className={cn(
        "group relative block aspect-[5/4] overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {image && (
        <Image
          src={image}
          alt={`${name} flooring`}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark/85 via-charcoal-dark/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-primary-foreground md:p-6">
        <div className="min-w-0">
          <h3 className="font-display text-lg tracking-tight md:text-2xl">{name}</h3>
          {(tagline || hasCount) && (
            <p className="mt-0.5 line-clamp-1 text-xs text-primary-foreground/75 md:text-sm">
              {[tagline, hasCount && `${productCount} products`].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-gold group-hover:text-charcoal-dark sm:grid">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
