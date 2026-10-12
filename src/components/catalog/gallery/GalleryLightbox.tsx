"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GalleryThumbnails } from "./GalleryThumbnails";
import { LazyPanoramaViewer } from "./LazyPanoramaViewer";
import { SpinViewer } from "./SpinViewer";
import { MAX_SCALE, ZoomPanImage, type ZoomPanHandle } from "./ZoomPanImage";
import { describeItem, type GalleryItem } from "./items";

/**
 * Full-screen media viewer. Photos zoom to {@link MAX_SCALE}× and pan; the
 * 360° spin and room panorama get the whole screen. Arrows, swipes and the
 * thumbnail rail move between items; the keyboard covers everything:
 * ←/→ previous and next, +/− zoom, 0 reset, F full screen, Esc close.
 */
export function GalleryLightbox({
  items,
  index,
  open,
  title,
  onIndexChange,
  onOpenChange,
}: {
  items: GalleryItem[];
  index: number;
  open: boolean;
  title: string;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const zoomer = useRef<ZoomPanHandle>(null);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const item = items[index];
  const count = items.length;

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function go(direction: -1 | 1) {
    setScale(1);
    onIndexChange((index + direction + count) % count);
  }

  function select(next: number) {
    setScale(1);
    onIndexChange(next);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await content.current?.requestFullscreen();
    } catch {
      // Not allowed here (e.g. iOS Safari) — the lightbox is already full-window.
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
      "+": () => zoomer.current?.zoomIn(),
      "=": () => zoomer.current?.zoomIn(),
      "-": () => zoomer.current?.zoomOut(),
      "0": () => zoomer.current?.reset(),
      f: () => void toggleFullscreen(),
      F: () => void toggleFullscreen(),
    };
    const action = actions[event.key];
    if (!action || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    action();
  }

  if (!item) return null;

  const isPhoto = item.kind === "image";
  const caption = item.kind === "spin" ? null : item.caption;
  const neighbours =
    count > 1 ? [items[(index + 1) % count], items[(index - 1 + count) % count]] : [];
  const tool =
    "grid h-10 w-10 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-35";
  const arrow =
    "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:grid";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-dark/95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={content}
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-charcoal-dark text-white outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <header className="flex items-center gap-2 px-3 py-2 sm:px-5">
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm">
              <span className="font-mono text-white/60" aria-live="polite">
                {index + 1} / {count}
              </span>
              <span className="ml-3 hidden font-display sm:inline">{title}</span>
              <span className="sr-only"> — {describeItem(item)}</span>
            </Dialog.Title>

            {isPhoto && (
              <div className="flex items-center" role="group" aria-label="Zoom">
                <button
                  type="button"
                  className={tool}
                  onClick={() => zoomer.current?.zoomOut()}
                  disabled={scale <= 1.01}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" aria-hidden />
                </button>
                <span className="w-12 text-center font-mono text-xs text-white/70" aria-hidden>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  className={tool}
                  onClick={() => zoomer.current?.zoomIn()}
                  disabled={scale >= MAX_SCALE - 0.01}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={tool}
                  onClick={() => zoomer.current?.reset()}
                  disabled={scale <= 1.01}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}

            <button
              type="button"
              className={cn(tool, "hidden sm:grid")}
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? (
                <Minimize className="h-5 w-5" aria-hidden />
              ) : (
                <Maximize className="h-5 w-5" aria-hidden />
              )}
            </button>
            <Dialog.Close className={tool} aria-label="Close gallery">
              <X className="h-5 w-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="relative min-h-0 flex-1">
            {item.kind === "image" && (
              <ZoomPanImage
                key={item.id}
                ref={zoomer}
                item={item}
                onScaleChange={setScale}
                onSwipe={go}
              />
            )}
            {item.kind === "spin" && (
              <SpinViewer
                key={item.id}
                frames={item.frames}
                alt={item.alt}
                sizes="100vw"
                tone="dark"
              />
            )}
            {item.kind === "panorama" && (
              <LazyPanoramaViewer key={item.id} url={item.url} alt={item.alt} tone="dark" />
            )}

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className={cn(arrow, "left-4")}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className={cn(arrow, "right-4")}
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}

            {/* Warm the cache for the photos either side, so stepping is instant. */}
            <div
              className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
              aria-hidden
            >
              {neighbours.map((neighbour) =>
                neighbour?.kind === "image" ? (
                  <Image
                    key={neighbour.id}
                    src={neighbour.zoomUrl}
                    alt=""
                    width={1}
                    height={1}
                    sizes="100vw"
                    loading="eager"
                  />
                ) : null,
              )}
            </div>
          </div>

          <footer className="space-y-2 px-3 pb-3 pt-2 sm:px-5">
            <p className="min-h-5 text-center text-sm text-white/75">
              {caption ?? (isPhoto ? item.alt : null)}
              {isPhoto && scale <= 1.01 && (
                <span className="ml-2 hidden text-xs text-white/45 pointer-fine:inline">
                  Click or scroll to zoom
                </span>
              )}
              {isPhoto && scale <= 1.01 && (
                <span className="ml-2 text-xs text-white/45 pointer-fine:hidden">
                  Double-tap or pinch to zoom
                </span>
              )}
            </p>
            {count > 1 && (
              <GalleryThumbnails
                items={items}
                activeIndex={index}
                onSelect={select}
                tone="dark"
                className="mx-auto max-w-3xl"
              />
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
