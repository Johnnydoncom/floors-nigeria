"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import {
  HERO_INTERVAL,
  heroFallbackSrc,
  heroSrcSet,
  type HeroImage,
  type HeroSlide,
} from "@/lib/home/hero-slides";
import { cn } from "@/lib/utils";

export type HeroSlideView = HeroSlide & {
  /** One line under the tab: a "from" price, or what the projects add up to. */
  note?: string | null;
};

/**
 * A new slide is laid in boards: the photograph arrives in horizontal strips,
 * staggered like planks going down, rather than as a crossfade.
 */
const BOARDS = 7;
const BOARD_DELAYS = [0, 170, 60, 250, 110, 320, 30];
const BOARD_MS = 900;
const LAID_AFTER = BOARD_MS + Math.max(...BOARD_DELAYS);

const SWIPE_PX = 48;

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function HeroSlider({ slides, heading }: { slides: HeroSlideView[]; heading: string }) {
  const baseId = useId();
  const count = slides.length;
  const reducedMotion = usePrefersReducedMotion();

  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // Bumped on every change so the boards and the copy animate again.
  const [run, setRun] = useState(0);
  // Slides whose photographs may load: the current one and the next.
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const [offscreen, setOffscreen] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (next: number) => {
      const target = (next + count) % count;
      if (target === index) return;
      setPrevious(index);
      setIndex(target);
      setRun((value) => value + 1);
      setLoaded((current) => new Set(current).add(target).add((target + 1) % count));
    },
    [count, index],
  );

  // The old slide stays underneath until the last board is down.
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), reducedMotion ? 400 : LAID_AFTER);
    return () => window.clearTimeout(timer);
  }, [previous, run, reducedMotion]);

  // Fetch the other photographs once the first has had the network to itself,
  // so a board is never laid before its picture has arrived.
  useEffect(() => {
    const preload = () => setLoaded(new Set(Array.from({ length: count }, (_, i) => i)));
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(preload, 2000);
    return () => clearTimeout(timer);
  }, [count]);

  // No rotation while the hero is scrolled away or the tab is in the background.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(root);
    const onVisibility = () => setOffscreen(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const rotating = !reducedMotion && !stopped && !held && !offscreen;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = (next + count) % count;
    go(target);
    tabRefs.current[target]?.focus();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    swipeFrom.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent) {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? index + 1 : index - 1);
  }

  const slide = slides[index];

  return (
    // On phones the slide tabs must clear the action bar (4rem), so the hero is
    // that much shorter there — a fixed amount, so nothing jumps as it hides.
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured floors"
      className="relative isolate h-[calc(100svh-var(--header-height))] max-h-[54rem] min-h-[36rem] max-lg:h-[calc(100svh-var(--header-height)-4rem)] overflow-hidden bg-charcoal-dark text-primary-foreground"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeFrom.current = null)}
    >
      {/* Photographs */}
      {slides.map((item, position) => {
        const isCurrent = position === index;
        const isPrevious = position === previous;
        const hasPicture = loaded.has(position) || isCurrent;

        const laying = isCurrent && previous !== null && !reducedMotion;

        return (
          <div
            key={position}
            id={`${baseId}-slide-${position}`}
            role="tabpanel"
            aria-roledescription="slide"
            aria-label={`${position + 1} of ${count}: ${item.label}`}
            aria-hidden={!isCurrent}
            className={cn(
              "absolute inset-0",
              isCurrent ? "z-20" : isPrevious ? "z-10" : "invisible z-0",
              isCurrent && previous !== null && reducedMotion && "hero-fade-in",
            )}
          >
            <div
              key={isCurrent ? run : "rest"}
              className={cn("absolute inset-0", isCurrent && "hero-settle")}
            >
              {!hasPicture ? null : laying ? (
                Array.from({ length: BOARDS }, (_, board) => (
                  <div
                    key={board}
                    className="hero-board absolute inset-x-0 overflow-hidden"
                    style={{
                      top: `${(board * 100) / BOARDS}%`,
                      // A hair taller than its share so boards never leave a seam.
                      height: `calc(${100 / BOARDS}% + 1px)`,
                      animationDelay: `${BOARD_DELAYS[board % BOARD_DELAYS.length]}ms`,
                      animationDuration: `${BOARD_MS}ms`,
                    }}
                  >
                    <div
                      className="absolute inset-x-0"
                      style={{ top: `-${board * 100}%`, height: `${BOARDS * 100}%` }}
                    >
                      <SlidePicture slide={item} priority={position === 0} />
                    </div>
                  </div>
                ))
              ) : (
                <SlidePicture slide={item} priority={position === 0} />
              )}
            </div>
          </div>
        );
      })}

      {/* Legibility: dark from the left for the copy, from the bottom for the tabs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(90deg,oklch(0.145_0.002_85/0.78)_0%,oklch(0.145_0.002_85/0.42)_42%,transparent_70%)] max-md:bg-[linear-gradient(0deg,oklch(0.145_0.002_85/0.9)_0%,oklch(0.145_0.002_85/0.55)_45%,oklch(0.145_0.002_85/0.1)_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-48 bg-gradient-to-t from-charcoal-dark/85 to-transparent"
      />

      {/* Copy */}
      <div className="container-fluid relative z-40 flex h-full flex-col justify-end pb-28 md:justify-center md:pb-24">
        <div className="max-w-[40rem]">
          <h1 className="font-display text-sm font-medium text-primary-foreground/75">{heading}</h1>
          <div key={run} className="hero-copy-in">
            <h2 className="mt-4 text-balance font-display text-[2.4rem] leading-[1.04] tracking-[-0.025em] sm:text-5xl lg:text-[4.1rem]">
              {slide.title}
            </h2>
            <p className="mt-5 max-w-[34rem] text-pretty text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              {slide.copy}
            </p>
            <p className="mt-4 font-display text-sm font-semibold text-gold-light md:hidden">
              {slide.note ?? slide.hint}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={slide.primary.href} className="btn btn-gold">
                {slide.primary.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href={slide.secondary.href} className="btn btn-outline-light max-sm:hidden">
                {slide.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: one per slide, each a progress bar while it is showing. */}
      <div className="absolute inset-x-0 bottom-0 z-40">
        <div className="container-fluid flex items-end gap-3 pb-5 md:gap-6 md:pb-7">
          <button
            type="button"
            onClick={() => setStopped((value) => !value)}
            aria-label={stopped ? "Play slides" : "Pause slides"}
            className={cn(
              "grid grid-cols-1 h-9 w-9 shrink-0 place-items-center rounded-full border border-primary-foreground/30 text-primary-foreground/90 transition hover:border-primary-foreground hover:bg-primary-foreground/10",
              reducedMotion && "hidden",
            )}
          >
            {stopped ? (
              <Play className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>

          <div
            role="tablist"
            aria-label="Choose a slide"
            className="grid flex-1 grid-cols-4 gap-2 md:gap-5"
          >
            {slides.map((item, position) => {
              const selected = position === index;
              return (
                <button
                  key={item.id}
                  ref={(element) => {
                    tabRefs.current[position] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${position}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-slide-${position}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => go(position)}
                  onKeyDown={onTabKeyDown}
                  className="group min-w-0 py-2 text-left"
                >
                  <span className="relative block h-[3px] overflow-hidden rounded-full bg-primary-foreground/25">
                    <span
                      key={selected ? run : "idle"}
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gold",
                        selected ? (reducedMotion ? "w-full" : "hero-progress") : "w-0",
                      )}
                      style={
                        selected && !reducedMotion
                          ? {
                              animationDuration: `${HERO_INTERVAL}ms`,
                              animationPlayState: rotating ? "running" : "paused",
                            }
                          : undefined
                      }
                      onAnimationEnd={selected ? () => go(index + 1) : undefined}
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-3 hidden truncate font-display text-sm font-semibold transition-colors md:block",
                      selected
                        ? "text-primary-foreground"
                        : "text-primary-foreground/60 group-hover:text-primary-foreground/90",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-xs text-primary-foreground/55 lg:block">
                    {item.note ?? item.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SlidePicture({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const position = slide.image.position ?? "50% 50%";
  const mirror = slide.mirror ? "scaleX(-1)" : undefined;

  return (
    <>
      <Photo
        image={slide.image}
        alt={slide.after ? "" : slide.image.alt}
        priority={priority}
        style={{ objectPosition: position, transform: mirror }}
      />
      {slide.after && (
        // Before on the left, after on the right, with the line sweeping between them.
        <div
          className="hero-wipe absolute inset-0"
          role="img"
          aria-label={`${slide.image.alt}, beside ${slide.after.alt.toLowerCase()}`}
        >
          {/* Clipped on a wrapper: a clip on the flipped image would flip too. */}
          <div className="hero-wipe-after absolute inset-0">
            <Photo
              image={slide.after}
              alt=""
              style={{ objectPosition: position, transform: mirror }}
            />
          </div>
          <span
            aria-hidden
            className="hero-wipe-line absolute inset-y-0 w-0.5 bg-primary-foreground/90 shadow-[0_0_24px_oklch(0_0_0/0.35)]"
          />
          <span
            aria-hidden
            className="hero-wipe-before absolute top-5 rounded-full bg-charcoal-dark/60 px-3 py-1 font-display text-xs font-semibold md:top-8"
          >
            Before
          </span>
          <span
            aria-hidden
            className="hero-wipe-label absolute top-5 rounded-full bg-gold px-3 py-1 font-display text-xs font-semibold text-charcoal-dark md:top-8"
          >
            After
          </span>
        </div>
      )}
    </>
  );
}

/**
 * Image optimisation is off site-wide (next.config.ts), so the hero's
 * photographs are pre-sized WebP files and the browser picks a width.
 * Pictures mount only when wanted (see `loaded`), so they load at once.
 */
function Photo({
  image,
  alt,
  priority = false,
  style,
}: {
  image: HeroImage;
  alt: string;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized srcset; next/image is unoptimized here
    <img
      src={heroFallbackSrc(image)}
      srcSet={heroSrcSet(image)}
      sizes="100vw"
      alt={alt}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className="absolute inset-0 h-full w-full object-cover"
      style={style}
    />
  );
}
