"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { getTexture } from "@/lib/visualizer/images";
import { materialKey } from "@/lib/visualizer/library";
import { TEMPLATE_ROOMS } from "@/lib/visualizer/template-rooms";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/** The renderer, fetched once the page is idle — never before the hero has painted. */
const RoomPreviewCanvas = dynamic(() => import("@/components/visualizer/RoomPreviewCanvas"), {
  ssr: false,
  loading: () => null,
});

const ROOM = TEMPLATE_ROOMS[0];

/**
 * The homepage hero's room: a photograph first — it is the page's largest
 * paint — and, once the browser is idle, the same room with real floors from
 * the catalogue laid in it, one tap apart. The quickest possible answer to
 * "what would this look like at home?", and the way into the visualizer.
 */
export function HeroRoomTeaser({ floors }: { floors: TextureChoice[] }) {
  const [isLive, setIsLive] = useState(false);
  const [selected, setSelected] = useState<TextureChoice | null>(floors[0] ?? null);

  useEffect(() => {
    if (floors.length === 0) return;
    const start = () => setIsLive(true);
    const idle = window.requestIdleCallback?.(start, { timeout: 2500 });
    const timer = idle === undefined ? window.setTimeout(start, 1200) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [floors.length]);

  const href = selected
    ? `/visualizer?product=${encodeURIComponent(selected.productSlug)}`
    : "/visualizer";

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-2xl bg-muted shadow-luxe"
        style={{ aspectRatio: `${ROOM.width} / ${ROOM.height}` }}
      >
        <Image
          src={ROOM.src}
          alt={`${ROOM.label} — a sample room in the Floors NG visualizer`}
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
        {isLive && selected && (
          <div className="absolute inset-0 [&_.rounded-lg]:rounded-none">
            <RoomPreviewCanvas room={ROOM} material={selected} rotation={0} controls={false} />
          </div>
        )}

        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
          Live room preview
        </span>
      </div>

      {floors.length > 0 && (
        <div className="relative -mt-8 mx-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-luxe backdrop-blur sm:mx-6">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Try a floor
            </p>
            <p className="truncate text-sm font-semibold">
              {selected ? (selected.variantName ?? selected.productName) : "—"}
            </p>
          </div>
          <div role="radiogroup" aria-label="Floor in the sample room" className="flex gap-1.5">
            {floors.map((floor) => {
              const active = selected !== null && materialKey(floor) === materialKey(selected);
              const label = floor.variantName
                ? `${floor.productName} — ${floor.variantName}`
                : floor.productName;
              return (
                <button
                  key={materialKey(floor)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  title={label}
                  onClick={() => {
                    setSelected(floor);
                    setIsLive(true);
                  }}
                  onPointerEnter={() => void getTexture(floor.textureUrl).catch(() => undefined)}
                  className={cn(
                    "relative h-10 w-10 overflow-hidden rounded-md bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    active
                      ? "ring-2 ring-charcoal ring-offset-2 ring-offset-background"
                      : "hover:-translate-y-0.5",
                  )}
                >
                  <Image
                    src={floor.swatchUrl ?? floor.textureUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
          <Link
            href={href}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-charcoal px-4 text-xs font-semibold text-primary-foreground transition hover:bg-charcoal-dark"
          >
            Try your room
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
