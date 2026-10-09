import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Paths `next/image` is allowed to optimize (see `images.localPatterns` in
 * next.config): proxied media and the storefront's own photography.
 */
export function isOptimizable(src: string): boolean {
  return /^\/(media|images)\//.test(src) && !src.includes("?");
}

/**
 * A filled image for CMS content. Editors may point a cover at any https
 * address; only local paths go through the optimizer, the rest render as a
 * plain lazy image rather than failing.
 */
export function ContentImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote CMS image outside the optimizer's allow-list
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
