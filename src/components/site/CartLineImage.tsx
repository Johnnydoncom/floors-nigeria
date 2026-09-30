import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The thumbnail beside a line in the cart, the drawer and the checkout summary.
 *
 * A cart lives in the browser and keeps whatever image URL the product had when
 * it was added — and a product with no photography yet stores an empty string.
 * A missing image is therefore ordinary rather than exceptional, and gets a
 * neutral block instead of the browser's broken-image glyph.
 *
 * Shared because all three places show the same thing at different sizes, and
 * the fallback is the part that is easy to forget.
 */
export function CartLineImage({
  src,
  alt,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  /** What the thumbnail measures at each breakpoint, for the optimizer. */
  sizes: string;
  className?: string;
}) {
  if (!src) {
    return <span className={cn("block bg-muted", className)} aria-hidden />;
  }

  return (
    <span className={cn("relative block overflow-hidden bg-muted", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </span>
  );
}
