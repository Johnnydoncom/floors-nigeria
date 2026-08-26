"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Ignore jitter; only a deliberate scroll should move the bar. */
const SCROLL_THRESHOLD_PX = 6;

/** Distance from the top within which the bar is always shown. */
const REVEAL_ZONE_PX = 24;

/**
 * Collapses the utility strip when the visitor scrolls down and brings it back
 * when they scroll up, so the catalogue gets the screen while browsing but the
 * phone number is never more than a flick away (§32).
 *
 * A client wrapper around server-rendered children: the contact details stay
 * in the prerendered HTML, and only this behaviour ships as JavaScript.
 */
export function UtilityBar({ children }: { children: React.ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      if (Math.abs(delta) < SCROLL_THRESHOLD_PX) return;

      setIsHidden(current > REVEAL_ZONE_PX && delta > 0);
      lastScrollY.current = current;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      // Collapsing the height rather than translating keeps the rows below it
      // from sliding under the viewport edge.
      className={cn(
        "hidden overflow-hidden bg-charcoal-dark text-primary-foreground transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none md:block",
        isHidden ? "h-0 opacity-0" : "h-9 opacity-100",
      )}
      aria-hidden={isHidden}
    >
      {children}
    </div>
  );
}
