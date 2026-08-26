import Image from "next/image";
import type { AttributeTerm } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6",
  md: "h-11 w-11",
  lg: "h-14 w-14",
} as const;

export type SwatchSize = keyof typeof SIZES;

/**
 * Renders one attribute term the way its attribute asks to be shown: a colour
 * chip, a photographed material tile, or a typographic chip for values like
 * "5mm" (§8).
 *
 * Presentation only — it never carries the selected state or the click target,
 * so it can sit inside a radio button, a filter row or a product card alike.
 */
export function Swatch({
  term,
  size = "md",
  className,
}: {
  term: AttributeTerm;
  size?: SwatchSize;
  className?: string;
}) {
  const base = cn(
    "relative block shrink-0 overflow-hidden border border-border",
    SIZES[size],
    className,
  );

  if (term.swatch_type === "image" && term.image_url) {
    return (
      <span className={base}>
        <Image src={term.image_url} alt="" fill sizes="64px" className="object-cover" />
      </span>
    );
  }

  if (term.swatch_type === "color" && term.color_hex) {
    return <span className={base} style={{ backgroundColor: term.color_hex }} />;
  }

  // Button and label terms read as type — thickness, pile height, AC rating.
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border border-border px-3 font-mono text-[11px] uppercase tracking-[0.08em]",
        size === "sm" ? "h-6" : "h-11",
        className,
      )}
    >
      {term.label}
    </span>
  );
}

/**
 * A compact row of swatches for product cards: shows the first few terms and
 * how many more the product comes in.
 */
export function SwatchPreview({
  terms,
  total,
  className,
}: {
  terms: AttributeTerm[];
  total: number;
  className?: string;
}) {
  if (terms.length === 0) return null;

  const remaining = total - terms.length;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {terms.map((term) => (
        <Swatch key={term.id} term={term} size="sm" />
      ))}
      {remaining > 0 && (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          +{remaining}
        </span>
      )}
      <span className="sr-only">
        Available in {total} {total === 1 ? "finish" : "finishes"}
      </span>
    </div>
  );
}
