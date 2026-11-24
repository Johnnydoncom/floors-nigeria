"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A horizontal row that scrolls by touch, trackpad or its own buttons, and
 * snaps to items. The items are rendered on the server and passed in.
 */
export function ScrollRail({
  label,
  header,
  children,
  tone = "light",
  className,
}: {
  /** The section heading, set beside the scroll buttons. */
  header?: ReactNode;
  /** Names the list for assistive technology, e.g. "Bestsellers". */
  label: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setEdges({ start: element.scrollLeft <= 4, end: element.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function page(direction: 1 | -1) {
    const element = track.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: "smooth" });
  }

  const button = cn(
    "grid h-10 w-10 place-items-center rounded-full border transition disabled:pointer-events-none disabled:opacity-30",
    tone === "dark"
      ? "border-primary-foreground/30 text-primary-foreground hover:border-primary-foreground"
      : "border-border bg-background hover:border-foreground",
  );

  return (
    <div className={className}>
      <div className="flex items-end gap-6">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button
            type="button"
            className={button}
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label={`Scroll ${label} back`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={button}
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label={`Scroll ${label} forward`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {/* `relative` makes the row the containing block of anything absolutely
          positioned inside it (screen-reader text in the cards), so its
          overflow is clipped here instead of widening the whole page. */}
      <ul
        ref={track}
        aria-label={label}
        className="scrollbar-none relative -mx-5 mt-8 flex md:mt-10 snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:-mx-8 md:scroll-px-8 md:px-8 xl:-mx-12 xl:scroll-px-12 xl:px-12"
      >
        {children}
      </ul>
    </div>
  );
}
