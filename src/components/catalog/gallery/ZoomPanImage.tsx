"use client";

import Image from "next/image";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import { STAGE_SIZES, type GalleryImageItem } from "./items";

export const MAX_SCALE = 4;
const STEP = 1.6;
const TAP_ZOOM = 2.5;
const SWIPE_THRESHOLD = 60;
const DOUBLE_TAP_MS = 300;

export type ZoomPanHandle = { zoomIn: () => void; zoomOut: () => void; reset: () => void };

type Transform = { s: number; x: number; y: number };
const IDENTITY: Transform = { s: 1, x: 0, y: 0 };

/**
 * A photograph that can be zoomed to {@link MAX_SCALE}× and panned, for the
 * lightbox. Wheel or trackpad pinch zooms toward the cursor, a click or
 * double-tap toggles a close-up at that point, two fingers pinch, and a drag
 * pans — clamped so the photo never slides away from the edges. At 1× a
 * horizontal swipe changes image instead.
 *
 * The full-resolution source is requested at a larger `sizes` once zoomed,
 * so close-ups stay sharp without downloading it up front.
 */
export function ZoomPanImage({
  item,
  ref,
  onScaleChange,
  onSwipe,
}: {
  item: GalleryImageItem;
  ref?: Ref<ZoomPanHandle>;
  onScaleChange?: (scale: number) => void;
  onSwipe?: (direction: -1 | 1) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const current = useRef<Transform>(IDENTITY);
  const aspect = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, moved: false, pinch: 0, lastTap: 0 });
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [animate, setAnimate] = useState(false);
  const [sharp, setSharp] = useState(false);

  function size() {
    const element = box.current;
    return { w: element?.clientWidth ?? 1, h: element?.clientHeight ?? 1 };
  }

  /** The photo's on-screen size at 1×, letterboxed inside the frame. */
  function fitted() {
    const { w, h } = size();
    const ratio = aspect.current;
    if (!ratio) return { w, h, iw: w, ih: h };
    return w / h > ratio ? { w, h, iw: h * ratio, ih: h } : { w, h, iw: w, ih: w / ratio };
  }

  function clamp(next: Transform): Transform {
    const { w, h, iw, ih } = fitted();
    const s = Math.min(Math.max(next.s, 1), MAX_SCALE);
    const axis = (offset: number, frame: number, image: number) =>
      s * image <= frame
        ? (frame * (1 - s)) / 2
        : Math.min(Math.max(offset, frame - (s * (frame + image)) / 2), (-s * (frame - image)) / 2);
    return { s, x: axis(next.x, w, iw), y: axis(next.y, h, ih) };
  }

  function commit(next: Transform, smooth = false) {
    const clamped = clamp(next);
    current.current = clamped;
    setAnimate(smooth);
    setTransform(clamped);
    onScaleChange?.(clamped.s);
  }

  /** Scale to `scale`, keeping the point under (px, py) where it is. */
  function zoomAt(px: number, py: number, scale: number, smooth = false) {
    const { s, x, y } = current.current;
    const target = Math.min(Math.max(scale, 1), MAX_SCALE);
    commit({ s: target, x: px - ((px - x) / s) * target, y: py - ((py - y) / s) * target }, smooth);
  }

  function zoomCentre(scale: number) {
    const { w, h } = size();
    zoomAt(w / 2, h / 2, scale, true);
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomCentre(current.current.s * STEP),
    zoomOut: () => zoomCentre(current.current.s / STEP),
    reset: () => commit(IDENTITY, true),
  }));

  // Wheel and trackpad-pinch zoom. Non-passive, so the page itself never zooms.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const sensitivity = event.ctrlKey ? 0.01 : 0.0015;
      zoomAt(
        event.clientX - rect.left,
        event.clientY - rect.top,
        current.current.s * Math.exp(-event.deltaY * sensitivity),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
    // zoomAt only reads refs; binding once is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A resize (rotating a phone, entering full screen) invalidates the clamp.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() => commit(IDENTITY));
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function local(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current = {
        ...gesture.current,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
    } else if (pointers.current.size === 2) {
      gesture.current.pinch = pinchDistance();
      gesture.current.moved = true;
    }
  }

  function pinchDistance() {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      const distance = pinchDistance();
      if (gesture.current.pinch > 0) {
        zoomAt(
          (a.x + b.x) / 2 - rect.left,
          (a.y + b.y) / 2 - rect.top,
          current.current.s * (distance / gesture.current.pinch),
        );
      }
      gesture.current.pinch = distance;
      return;
    }

    const travelled = Math.hypot(
      event.clientX - gesture.current.startX,
      event.clientY - gesture.current.startY,
    );
    if (travelled > 5) gesture.current.moved = true;

    const { s, x, y } = current.current;
    if (s > 1) {
      commit({ s, x: x + event.clientX - previous.x, y: y + event.clientY - previous.y });
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size > 0) return;
    gesture.current.pinch = 0;

    const dx = event.clientX - gesture.current.startX;
    const dy = event.clientY - gesture.current.startY;
    const zoomed = current.current.s > 1.01;

    if (!gesture.current.moved) {
      const point = local(event);
      const isMouse = event.pointerType === "mouse";
      const doubleTap = event.timeStamp - gesture.current.lastTap < DOUBLE_TAP_MS;
      gesture.current.lastTap = isMouse ? 0 : event.timeStamp;

      if (isMouse || doubleTap) {
        if (zoomed) commit(IDENTITY, true);
        else zoomAt(point.x, point.y, TAP_ZOOM, true);
      }
      return;
    }

    if (!zoomed && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      onSwipe?.(dx < 0 ? 1 : -1);
    }
  }

  const zoomed = transform.s > 1.01;

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden",
        zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 origin-top-left will-change-transform",
          animate && "transition-transform duration-300 ease-out",
        )}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.s})`,
        }}
      >
        {/* The stage's rendition is usually cached: show it until the full-size one lands. */}
        {!sharp && (
          <Image
            src={item.url}
            alt=""
            fill
            sizes={STAGE_SIZES}
            draggable={false}
            className="object-contain"
          />
        )}
        <Image
          src={item.zoomUrl}
          alt={item.alt}
          fill
          loading="eager"
          draggable={false}
          sizes={zoomed ? "300vw" : "100vw"}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) {
              aspect.current = image.naturalWidth / image.naturalHeight;
            }
            setSharp(true);
          }}
          className="object-contain"
        />
      </div>
    </div>
  );
}
