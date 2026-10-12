"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Orbit, Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeItem, type GalleryItem } from "./items";

/**
 * One horizontal, scroll-snapping row of thumbnails. It scrolls by touch or
 * trackpad, and shows arrow buttons on whichever edge has more to reveal.
 * The active thumbnail is kept in view — horizontally only, so changing image
 * never scrolls the page.
 */
export function GalleryThumbnails({
  items,
  activeIndex,
  onSelect,
  tone = "light",
  className,
}: {
  items: GalleryItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const element = rail.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setEdges({ start: element.scrollLeft > 2, end: element.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    const element = rail.current;
    const thumb = element?.children[activeIndex] as HTMLElement | undefined;
    if (!element || !thumb) return;

    const left = thumb.offsetLeft - element.offsetLeft;
    const right = left + thumb.offsetWidth;
    if (left < element.scrollLeft) {
      element.scrollTo({ left: left - 8, behavior: "smooth" });
    } else if (right > element.scrollLeft + element.clientWidth) {
      element.scrollTo({ left: right - element.clientWidth + 8, behavior: "smooth" });
    }
  }, [activeIndex]);

  function page(direction: -1 | 1) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  const dark = tone === "dark";
  const arrow = cn(
    "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
    dark
      ? "bg-white/15 text-white hover:bg-white/25"
      : "bg-background/95 text-foreground hover:bg-background",
  );

  return (
    <div className={cn("relative", className)}>
      {edges.start && (
        <button
          type="button"
          onClick={() => page(-1)}
          className={cn(arrow, "left-1")}
          aria-label="Scroll thumbnails back"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      )}

      <ul
        ref={rail}
        onScroll={measure}
        className="scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth overscroll-x-contain scroll-px-1 p-1"
        style={{
          maskImage: `linear-gradient(to right, ${edges.start ? "transparent" : "#000"}, #000 2.5rem, #000 calc(100% - 2.5rem), ${edges.end ? "transparent" : "#000"})`,
        }}
        aria-label="Product media thumbnails"
      >
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <li key={item.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`${describeItem(item)} — ${index + 1} of ${items.length}`}
                aria-current={active}
                className={cn(
                  "relative block h-16 w-16 overflow-hidden rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-20 sm:w-20",
                  active ? "ring-2 ring-gold ring-offset-2" : "opacity-60 hover:opacity-100",
                  dark ? "ring-offset-charcoal-dark" : "ring-offset-background",
                )}
              >
                <Image src={item.thumbUrl} alt="" fill sizes="80px" className="object-cover" />
                {item.kind !== "image" && (
                  <span className="absolute inset-0 grid place-items-center bg-charcoal-dark/45 text-white">
                    {item.kind === "spin" ? (
                      <Rotate3d className="h-6 w-6" aria-hidden />
                    ) : (
                      <Orbit className="h-6 w-6" aria-hidden />
                    )}
                    <span className="absolute bottom-1 font-mono text-[9px] font-semibold tracking-widest">
                      360°
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {edges.end && (
        <button
          type="button"
          onClick={() => page(1)}
          className={cn(arrow, "right-1")}
          aria-label="Scroll thumbnails forward"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
