"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type GalleryImage = { url: string; alt: string; thumbUrl?: string };

/**
 * Product media gallery (§9): large responsive image with keyboard-reachable
 * thumbnails. Selection is local state — the URL stays clean for sharing.
 */
export function ProductGallery({
  images,
  badge,
}: {
  images: GalleryImage[];
  badge?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-muted text-sm text-muted-foreground">
        Imagery coming soon
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted shadow-luxe">
        <Image
          src={active.url}
          alt={active.alt}
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
        />
        {badge && (
          <span className="absolute left-4 top-4 bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
            {badge}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3" role="list">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  index === activeIndex ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image.thumbUrl ?? image.url}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
