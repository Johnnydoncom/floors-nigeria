"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";

/** One full turn takes this long when autoplaying. */
const TURN_MS = 5000;

/** Release speed (px/ms) below which a drag just stops, without coasting. */
const MIN_FLING = 0.25;

const wrap = (value: number, length: number) => ((value % length) + length) % length;

/**
 * A 360° product spin from an ordered set of turntable frames.
 *
 * Every frame is loaded up front and stacked, so rotation is a visibility
 * swap with no network wait. Drag (or swipe) to turn it — a full-width drag is
 * one revolution and a fling coasts to a stop — or use the arrow keys.
 * It turns slowly on its own until touched, unless the visitor prefers
 * reduced motion.
 */
export function SpinViewer({
  frames,
  alt,
  sizes,
  className,
  tone = "light",
}: {
  frames: string[];
  alt: string;
  sizes: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const reduceMotion = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; frame: number; lastX: number; lastT: number; v: number } | null>(
    null,
  );
  const coast = useRef(0);
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [touched, setTouched] = useState(false);

  const count = frames.length;
  const ready = loaded >= count;
  const spinning = playing && ready && !reduceMotion;
  // Hold the first frame until the set is in, so a drag never lands on a blank.
  const shown = ready ? frame : 0;

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setInterval(
      () => setFrame((current) => wrap(current + 1, count)),
      Math.max(30, TURN_MS / count),
    );
    return () => window.clearInterval(timer);
  }, [spinning, count]);

  useEffect(() => () => cancelAnimationFrame(coast.current), []);

  function pixelsPerFrame() {
    return (surface.current?.clientWidth ?? 600) / count;
  }

  function interrupt() {
    cancelAnimationFrame(coast.current);
    setPlaying(false);
    setTouched(true);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!ready || event.button !== 0) return;
    interrupt();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      frame,
      lastX: event.clientX,
      lastT: event.timeStamp,
      v: 0,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;

    const elapsed = event.timeStamp - state.lastT;
    if (elapsed > 0) {
      state.v = (event.clientX - state.lastX) / elapsed;
      state.lastX = event.clientX;
      state.lastT = event.timeStamp;
    }
    setFrame(wrap(state.frame - Math.round((event.clientX - state.x) / pixelsPerFrame()), count));
  }

  function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state || Math.abs(state.v) < MIN_FLING || reduceMotion) return;

    // Coast: keep turning at the release speed, decaying each frame.
    let velocity = state.v;
    let travelled = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      velocity *= Math.pow(0.94, dt / 16);
      travelled += velocity * dt;
      const turned = Math.trunc(travelled / pixelsPerFrame());
      if (turned !== 0) {
        travelled -= turned * pixelsPerFrame();
        setFrame((current) => wrap(current - turned, count));
      }
      if (Math.abs(velocity) > 0.02) coast.current = requestAnimationFrame(step);
    };
    coast.current = requestAnimationFrame(step);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => setFrame((current) => wrap(current - 1, count)),
      ArrowRight: () => setFrame((current) => wrap(current + 1, count)),
      Home: () => setFrame(0),
      " ": () => setPlaying((current) => !current),
    };
    const move = moves[event.key];
    if (!move || !ready) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key !== " ") interrupt();
    move();
  }

  const dark = tone === "dark";
  const control = cn(
    "grid h-9 w-9 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
    dark ? "text-white hover:bg-white/15" : "hover:bg-muted",
  );

  return (
    <div className={cn("relative h-full w-full select-none", dark ? "" : "bg-white", className)}>
      <div
        ref={surface}
        role="slider"
        tabIndex={0}
        aria-label={`${alt}. Drag or use the arrow keys to rotate.`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={shown}
        aria-valuetext={`Turned ${Math.round((shown / count) * 360)}°`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "absolute inset-0 cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold active:cursor-grabbing",
          dark ? "touch-none" : "touch-pan-y",
        )}
      >
        {frames.map((src, index) => (
          <Image
            key={index}
            src={src}
            alt={index === 0 ? alt : ""}
            fill
            loading="eager"
            fetchPriority={index === 0 ? "high" : "low"}
            sizes={sizes}
            draggable={false}
            onLoad={() => setLoaded((current) => current + 1)}
            className={cn("object-contain", index === shown ? "visible" : "invisible")}
          />
        ))}
      </div>

      {!ready && (
        <div className="pointer-events-none absolute inset-x-6 bottom-20 text-center">
          <p className={cn("text-xs", dark ? "text-white/80" : "text-muted-foreground")}>
            Loading 360° view…
          </p>
          <div
            className={cn(
              "mx-auto mt-2 h-1 max-w-48 rounded-full",
              dark ? "bg-white/20" : "bg-muted",
            )}
          >
            <div
              className="h-full rounded-full bg-gold transition-[width]"
              style={{ width: `${Math.round((loaded / count) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {ready && !touched && (
        <p
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 mx-auto flex w-max -translate-y-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-lg",
            dark ? "bg-white/15 text-white" : "bg-background/90 text-foreground",
          )}
        >
          <Rotate3d className="h-4 w-4" aria-hidden />
          Drag to rotate
        </p>
      )}

      <div
        className={cn(
          "absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full p-1 shadow-lg",
          dark ? "bg-white/10" : "bg-background/95",
        )}
      >
        <button
          type="button"
          className={control}
          onClick={() => {
            interrupt();
            setFrame((current) => wrap(current - 1, count));
          }}
          aria-label="Rotate left"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={control}
          onClick={() => {
            setTouched(true);
            setPlaying((current) => !current);
          }}
          disabled={Boolean(reduceMotion)}
          aria-label={spinning ? "Pause rotation" : "Play rotation"}
        >
          {spinning ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className={control}
          onClick={() => {
            interrupt();
            setFrame((current) => wrap(current + 1, count));
          }}
          aria-label="Rotate right"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
