"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ContentImage } from "@/components/site/ContentImage";
import { cn } from "@/lib/utils";

export type GalleryPhoto = {
  id: number;
  src: string;
  thumb: string;
  alt: string;
  caption?: string | null;
};

/**
 * A project's photographs as a grid that opens into a full-screen viewer,
 * navigable by arrow keys and swipe-sized buttons.
 */
export function PhotoGallery({ photos, label }: { photos: GalleryPhoto[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (by: number) =>
      setOpen((current) =>
        current === null ? current : (current + by + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  if (photos.length === 0) return null;

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className={cn(index === 0 && photos.length > 4 && "col-span-2 row-span-2")}
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group relative block aspect-[4/3] h-full w-full overflow-hidden rounded-lg bg-muted"
              aria-label={`Open photo ${index + 1} of ${photos.length}${photo.alt ? `: ${photo.alt}` : ""}`}
            >
              <ContentImage
                src={photo.thumb}
                alt={photo.alt}
                sizes={
                  index === 0 && photos.length > 4
                    ? "(min-width: 768px) 66vw, 100vw"
                    : "(min-width: 768px) 33vw, 50vw"
                }
                className="transition-transform duration-700 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal
          aria-label={`${label} — photo ${open! + 1} of ${photos.length}`}
          className="fixed inset-0 z-[70] flex flex-col bg-charcoal-dark/95 text-primary-foreground"
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="tabular-nums opacity-70">
              {open! + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="relative flex-1">
            <ContentImage
              key={current.id}
              src={current.src}
              alt={current.alt}
              sizes="100vw"
              className="!object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-black/60 md:left-6"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-black/60 md:right-6"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}
          </div>

          {(current.caption || current.alt) && (
            <p className="px-4 py-4 text-center text-sm opacity-80">
              {current.caption || current.alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}
