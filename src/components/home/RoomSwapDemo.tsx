"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { getTexture } from "@/lib/visualizer/images";
import { materialKey } from "@/lib/visualizer/library";
import { TEMPLATE_ROOMS, templateRoom } from "@/lib/visualizer/template-rooms";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/** The renderer, fetched only once the room scrolls near the screen. */
const RoomPreviewCanvas = dynamic(() => import("@/components/visualizer/RoomPreviewCanvas"), {
  ssr: false,
  loading: () => null,
});

// The classic lounge: its floor mask holds up under dark floors as well as light.
const ROOM = templateRoom("classic-lounge") ?? TEMPLATE_ROOMS[0];

/**
 * A room from the visualizer with real floors from the catalogue, one tap
 * apart: the photograph first, the renderer once the room is about to be
 * seen. The quickest answer to "what would this look like at home?".
 */
export function RoomSwapDemo({ floors }: { floors: TextureChoice[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [selected, setSelected] = useState<TextureChoice | null>(floors[0] ?? null);

  useEffect(() => {
    const element = root.current;
    if (floors.length === 0 || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsLive(true);
        observer.disconnect();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [floors.length]);

  const href = selected
    ? `/visualizer?product=${encodeURIComponent(selected.productSlug)}`
    : "/visualizer";

  return (
    <div ref={root} className="relative">
      <div
        className="relative overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: `${ROOM.width} / ${ROOM.height}` }}
      >
        <Image
          src={ROOM.src}
          alt={`${ROOM.label} — a sample room in the Floors NG visualizer`}
          fill
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
        <div className="relative mx-3 -mt-8 flex flex-wrap items-center gap-3 rounded-xl bg-background p-3 text-foreground shadow-luxe sm:mx-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Tap a floor to lay it</p>
            <p className="truncate font-display text-sm font-semibold">
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
