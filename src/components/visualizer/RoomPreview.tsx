"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, RotateCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { materialKey } from "@/lib/visualizer/library";
import { TEMPLATE_ROOMS } from "@/lib/visualizer/template-rooms";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";
import { SwatchStrip } from "./SwatchStrip";

/** The renderer and everything it needs, fetched only when the preview is near. */
const RoomPreviewCanvas = dynamic(() => import("./RoomPreviewCanvas"), {
  ssr: false,
  loading: () => null,
});

/**
 * "See it in a room", on the product page (§10).
 *
 * The page pays nothing for it up front: until the section is within a screen
 * of the viewport it is a photograph of the room, and only then is the renderer
 * loaded — about the weight of one product photo, and no model, because every
 * room here is a template room whose floor and light were prepared in advance.
 * The colour follows the purchase panel's, and choosing one here chooses it
 * there.
 */
export function RoomPreview({
  choices,
  selected,
  onSelect,
  visualizerHref,
  productName,
}: {
  choices: TextureChoice[];
  selected: TextureChoice;
  onSelect: (choice: TextureChoice) => void;
  visualizerHref: string;
  productName: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isNear, setIsNear] = useState(false);
  const [roomId, setRoomId] = useState(TEMPLATE_ROOMS[0].id);
  const [rotation, setRotation] = useState(0);
  const room = TEMPLATE_ROOMS.find((candidate) => candidate.id === roomId) ?? TEMPLATE_ROOMS[0];

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || isNear) return;
    // Every browser the studio supports has IntersectionObserver.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          track("room_preview_opened", { product: selected.productSlug });
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isNear, selected.productSlug]);

  const name = selected.variantName ?? productName;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="room-preview-title"
      className="overflow-hidden rounded-2xl border border-border bg-surface/50"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
            See it in a room
          </p>
          <h2 id="room-preview-title" className="mt-1 font-display text-2xl tracking-tight">
            {name}, laid in a real room
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch rooms, turn the boards, drag the slider to compare — or try your own photo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => setRotation((current) => (current === 0 ? 90 : 0))}
            aria-label={`Turn the boards ${rotation === 0 ? "across" : "along"} the room`}
          >
            <RotateCw aria-hidden />
            Turn boards
          </Button>
          <Button asChild className="h-10 rounded-full">
            <Link href={visualizerHref}>
              <Upload aria-hidden />
              Try your own room
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 px-5 pb-5 md:px-6 md:pb-6 lg:grid-cols-[minmax(0,1fr)_200px]">
        {/* No taller than most of the screen: the whole room in view, with its controls. */}
        <div className="relative mx-auto w-full min-w-0 max-w-[calc(70dvh*1.5)]">
          {isNear ? (
            <RoomPreviewCanvas room={room} material={selected} rotation={rotation} />
          ) : (
            <div
              className="relative overflow-hidden rounded-lg bg-muted"
              style={{ aspectRatio: `${room.width} / ${room.height}` }}
            >
              <Image
                src={room.thumb}
                alt={`${room.label} sample room`}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Room"
          className="flex gap-2 overflow-x-auto [scrollbar-width:thin] lg:flex-col lg:overflow-visible"
        >
          {TEMPLATE_ROOMS.map((candidate) => {
            const active = candidate.id === room.id;
            return (
              <button
                key={candidate.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRoomId(candidate.id)}
                className={cn(
                  "group relative aspect-[3/2] w-32 shrink-0 overflow-hidden rounded-lg bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:w-full",
                  active
                    ? "ring-2 ring-charcoal ring-offset-2 ring-offset-background"
                    : "opacity-80 hover:opacity-100",
                )}
              >
                <Image src={candidate.thumb} alt="" fill sizes="200px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-left text-[11px] font-semibold text-white">
                  {candidate.label}
                </span>
              </button>
            );
          })}
          <Link
            href={visualizerHref}
            className="inline-flex shrink-0 items-center gap-1 self-center px-2 text-xs font-semibold underline-offset-2 hover:underline lg:self-start"
          >
            Open the full visualizer
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {choices.length > 1 && (
        <div className="border-t border-border px-5 py-3 md:px-6">
          <SwatchStrip
            items={choices}
            selected={
              choices.find((choice) => materialKey(choice) === materialKey(selected)) ?? null
            }
            onSelect={onSelect}
          />
        </div>
      )}
    </section>
  );
}
