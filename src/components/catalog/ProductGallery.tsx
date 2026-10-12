"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, Orbit, Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "./gallery/GalleryLightbox";
import { GalleryThumbnails } from "./gallery/GalleryThumbnails";
import { LazyPanoramaViewer } from "./gallery/LazyPanoramaViewer";
import { MagnifierImage } from "./gallery/MagnifierImage";
import { SpinViewer } from "./gallery/SpinViewer";
import { STAGE_SIZES, describeItem, type GalleryItem } from "./gallery/items";

/**
 * Product media gallery (§9).
 *
 * The stage shows the selected photo — magnified under a lens on hover,
 * swipeable on touch — or plays the 360° spin or room panorama in place.
 * Below it, one scrollable row of thumbnails. Any item opens full screen in
 * the lightbox, which shares the selection so closing it lands where the
 * shopper left off. Selection is local state; the URL stays clean for sharing.
 */
export function ProductGallery({
  items,
  title,
  badge,
}: {
  items: GalleryItem[];
  title: string;
  badge?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const count = items.length;
  const index = Math.min(activeIndex, Math.max(count - 1, 0));
  const active = items[index];

  if (!active) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-lg bg-muted text-sm text-muted-foreground">
        Imagery coming soon
      </div>
    );
  }

  const go = (direction: -1 | 1) => setActiveIndex((index + direction + count) % count);
  const next = count > 1 ? items[(index + 1) % count] : undefined;
  const spinIndex = items.findIndex((item) => item.kind === "spin");
  const panoramaIndex = items.findIndex((item) => item.kind === "panorama");
  const photoCount = items.filter((item) => item.kind === "image").length;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  const overlayButton =
    "grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground shadow-md transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
  const arrow = cn(
    overlayButton,
    "absolute top-1/2 z-10 -translate-y-1/2 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100",
  );

  return (
    <div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} media`}
        onKeyDown={onKeyDown}
        className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted shadow-luxe"
      >
        {active.kind === "image" && (
          <MagnifierImage
            key={active.id}
            item={active}
            eager={index === 0}
            onOpen={() => setLightboxOpen(true)}
            onSwipe={go}
          />
        )}
        {active.kind === "spin" && (
          <SpinViewer key={active.id} frames={active.frames} alt={active.alt} sizes={STAGE_SIZES} />
        )}
        {active.kind === "panorama" && (
          <LazyPanoramaViewer key={active.id} url={active.url} alt={active.alt} />
        )}

        <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-2">
          {badge && (
            <span className="rounded-sm bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
              {badge}
            </span>
          )}
          {active.kind === "image" && active.label && (
            <span className="rounded-sm bg-background/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
              {active.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className={cn(overlayButton, "absolute right-4 top-4 z-10")}
          aria-label="Open full-screen gallery"
        >
          <Expand className="h-4 w-4" aria-hidden />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={cn(arrow, "left-4")}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={cn(arrow, "right-4")}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}

        {active.kind === "image" && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
            {count > 1 ? (
              <span className="rounded-full bg-charcoal-dark/70 px-3 py-1 font-mono text-[11px] text-white">
                {index + 1} / {count}
              </span>
            ) : (
              <span />
            )}
            <span className="rounded-full bg-charcoal-dark/70 px-3 py-1 text-[11px] text-white">
              <span className="hidden pointer-fine:inline">Hover to zoom · click to expand</span>
              <span className="pointer-fine:hidden">Tap to expand</span>
            </span>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {describeItem(active)} {index + 1} of {count}
        </p>

        {/* Warm the cache for the next photo, so the arrow feels instant. */}
        {next?.kind === "image" && (
          <div
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            aria-hidden
          >
            <Image src={next.url} alt="" width={1} height={1} sizes={STAGE_SIZES} />
          </div>
        )}
      </div>

      {count > 1 && (
        <GalleryThumbnails
          items={items}
          activeIndex={index}
          onSelect={setActiveIndex}
          className="mt-3"
        />
      )}

      {(spinIndex >= 0 || panoramaIndex >= 0 || photoCount > 1) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {spinIndex >= 0 && (
            <button
              type="button"
              onClick={() => setActiveIndex(spinIndex)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-medium transition",
                index === spinIndex ? "border-foreground" : "border-border hover:border-foreground",
              )}
            >
              <Rotate3d className="h-4 w-4" aria-hidden />
              360° view
            </button>
          )}
          {panoramaIndex >= 0 && (
            <button
              type="button"
              onClick={() => setActiveIndex(panoramaIndex)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-medium transition",
                index === panoramaIndex
                  ? "border-foreground"
                  : "border-border hover:border-foreground",
              )}
            >
              <Orbit className="h-4 w-4" aria-hidden />
              360° room view
            </button>
          )}
          {photoCount > 1 && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium transition hover:border-foreground"
            >
              <Expand className="h-4 w-4" aria-hidden />
              View all {photoCount} photos
            </button>
          )}
        </div>
      )}

      <GalleryLightbox
        items={items}
        index={index}
        open={lightboxOpen}
        title={title}
        onIndexChange={setActiveIndex}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}
