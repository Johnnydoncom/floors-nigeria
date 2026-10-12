"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { STAGE_SIZES, type GalleryImageItem } from "./items";

/** Swipes shorter than this are taps; longer ones change image. */
const SWIPE_THRESHOLD = 48;

/**
 * The stage photograph. With a mouse, hovering shows a magnifying lens over
 * the full-resolution source; on touch, a horizontal swipe changes image.
 * Either way a click or tap opens the lightbox.
 *
 * The lens is positioned by writing styles straight to the DOM on pointer
 * move, so tracking the cursor never re-renders the gallery.
 */
export function MagnifierImage({
  item,
  eager,
  zoom = 2.5,
  onOpen,
  onSwipe,
}: {
  item: GalleryImageItem;
  eager?: boolean;
  zoom?: number;
  onOpen: () => void;
  onSwipe: (direction: -1 | 1) => void;
}) {
  const frame = useRef<HTMLButtonElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [magnifying, setMagnifying] = useState(false);

  function placeLens(event: PointerEvent<HTMLButtonElement>) {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !lens.current || !layer.current) return;

    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const radius = lens.current.offsetWidth / 2;

    lens.current.style.opacity = "1";
    lens.current.style.transform = `translate3d(${x - radius}px, ${y - radius}px, 0)`;
    layer.current.style.width = `${box.width * zoom}px`;
    layer.current.style.height = `${box.height * zoom}px`;
    layer.current.style.transform = `translate3d(${radius - x * zoom}px, ${radius - y * zoom}px, 0)`;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    swiped.current = false;
    touch.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      onSwipe(dx < 0 ? 1 : -1);
    }
  }

  return (
    <button
      ref={frame}
      type="button"
      onClick={() => {
        if (!swiped.current) onOpen();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setMagnifying(true);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") placeLens(event);
      }}
      onPointerLeave={() => setMagnifying(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (touch.current = null)}
      className="absolute inset-0 block h-full w-full touch-pan-y cursor-zoom-in focus-visible:outline-none"
      aria-label={`Open full-screen view: ${item.alt}`}
    >
      <Image
        src={item.url}
        alt={item.alt}
        fill
        preload={eager}
        sizes={STAGE_SIZES}
        className="object-cover"
        draggable={false}
      />

      {magnifying && (
        <div
          ref={lens}
          className="pointer-events-none absolute left-0 top-0 h-48 w-48 overflow-hidden rounded-full border-2 border-white bg-muted opacity-0 shadow-2xl ring-1 ring-black/10 xl:h-56 xl:w-56"
          aria-hidden
        >
          <div ref={layer} className="absolute left-0 top-0 h-full w-full">
            <Image
              src={item.zoomUrl}
              alt=""
              fill
              loading="eager"
              sizes="(min-width: 1024px) 145vw, 250vw"
              className="object-cover"
            />
          </div>
        </div>
      )}
    </button>
  );
}
