"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadImage, renderRoom } from "@/lib/visualizer/render";
import { QUAD_CORNER_LABELS, type Placement, type Point, type Quad } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/** Arrow-key nudge, as a fraction of the photo. */
const NUDGE = 0.005;

export type RoomStageHandle = {
  /**
   * The rendered room, for downloading or saving. PNG keeps a clean copy for
   * the visitor; JPEG keeps the upload small when saving to the server.
   */
  toBlob: (type?: "image/png" | "image/jpeg") => Promise<Blob | null>;
};

/**
 * The visualizer stage: the room photograph with the chosen material rendered
 * into the marked floor area, a before/after wipe, and draggable corners.
 *
 * Rendering runs on demand rather than per frame — placement changes are
 * discrete, and a phone should not be redrawing a full-resolution canvas
 * sixty times a second (§28).
 */
export function RoomStage({
  photoSrc,
  textureSrc,
  quad,
  placement,
  mask,
  isAdjusting,
  onQuadChange,
  onReady,
  className,
}: {
  photoSrc: string;
  textureSrc: string | null;
  quad: Quad;
  placement: Placement;
  /** Detected floor pixels; when absent the quad bounds the material. */
  mask?: CanvasImageSource | null;
  isAdjusting: boolean;
  onQuadChange: (quad: Quad) => void;
  onReady?: (handle: RoomStageHandle) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const textureRef = useRef<HTMLImageElement | null>(null);

  // Keyed by source so a new photo resets the status during render rather
  // than in an effect, which would paint the old room's state once more.
  const [status, setStatus] = useState<{ src: string; state: "loading" | "ready" | "error" }>({
    src: photoSrc,
    state: "loading",
  });

  if (status.src !== photoSrc) {
    setStatus({ src: photoSrc, state: "loading" });
  }

  const [wipe, setWipe] = useState(100);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;

    if (!canvas || !photo) return;

    renderRoom(canvas, {
      photo,
      photoWidth: photo.naturalWidth,
      photoHeight: photo.naturalHeight,
      texture: textureRef.current,
      quad,
      placement,
      mask,
    });
  }, [quad, placement, mask]);

  // Load the room photograph.
  useEffect(() => {
    let cancelled = false;

    loadImage(photoSrc)
      .then((image) => {
        if (cancelled) return;
        photoRef.current = image;
        setStatus({ src: photoSrc, state: "ready" });
        draw();
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({ src: photoSrc, state: "error" });
      });

    return () => {
      cancelled = true;
    };
    // `draw` is intentionally excluded: reloading the photo on every placement
    // change would flash the stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSrc]);

  // Load the chosen material.
  useEffect(() => {
    let cancelled = false;

    if (!textureSrc) {
      textureRef.current = null;
      draw();
      return;
    }

    loadImage(textureSrc)
      .then((image) => {
        if (cancelled) return;
        textureRef.current = image;
        draw();
      })
      .catch(() => {
        if (cancelled) return;
        textureRef.current = null;
        draw();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureSrc]);

  // Redraw when the placement or floor area changes.
  useEffect(draw, [draw]);

  useEffect(() => {
    onReady?.({
      toBlob: (type = "image/jpeg") =>
        new Promise((resolve) =>
          canvasRef.current
            ? canvasRef.current.toBlob((blob) => resolve(blob), type, 0.9)
            : resolve(null),
        ),
    });
  }, [onReady]);

  const pointToQuad = (event: React.PointerEvent, index: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const next = [...quad] as Quad;
    next[index] = {
      x: clamp((event.clientX - bounds.left) / bounds.width, -0.15, 1.15),
      y: clamp((event.clientY - bounds.top) / bounds.height, -0.15, 1.15),
    };
    onQuadChange(next);
  };

  const nudge = (index: number, delta: Point) => {
    const next = [...quad] as Quad;
    next[index] = {
      x: clamp(next[index].x + delta.x, -0.15, 1.15),
      y: clamp(next[index].y + delta.y, -0.15, 1.15),
    };
    onQuadChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden bg-muted"
        style={{ touchAction: draggingCorner === null ? "auto" : "none" }}
      >
        {/* The untouched room, revealed by the wipe. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a canvas-bound photo, not a catalogue asset */}
        <img src={photoSrc} alt="" className="block w-full" draggable={false} />

        <canvas
          ref={canvasRef}
          aria-label="Your room with the selected floor applied"
          className="absolute inset-0 h-full w-full"
          style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}
        />

        {isAdjusting && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <polygon
              points={quad.map((point) => `${point.x * 100}%,${point.y * 100}%`).join(" ")}
              className="fill-gold/10 stroke-gold"
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {isAdjusting &&
          quad.map((point, index) => (
            <button
              key={index}
              type="button"
              aria-label={`${QUAD_CORNER_LABELS[index]} of the floor. Drag, or use the arrow keys.`}
              onPointerDown={(event) => {
                (event.target as HTMLElement).setPointerCapture(event.pointerId);
                setDraggingCorner(index);
              }}
              onPointerMove={(event) => draggingCorner === index && pointToQuad(event, index)}
              onPointerUp={() => setDraggingCorner(null)}
              onPointerCancel={() => setDraggingCorner(null)}
              onKeyDown={(event) => {
                const deltas: Record<string, Point> = {
                  ArrowLeft: { x: -NUDGE, y: 0 },
                  ArrowRight: { x: NUDGE, y: 0 },
                  ArrowUp: { x: 0, y: -NUDGE },
                  ArrowDown: { x: 0, y: NUDGE },
                };
                const delta = deltas[event.key];
                if (!delta) return;
                event.preventDefault();
                nudge(index, delta);
              }}
              className={cn(
                "absolute z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-background/90 shadow-luxe transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                draggingCorner === index ? "scale-110 cursor-grabbing" : "cursor-grab",
              )}
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <span className="mx-auto block h-2 w-2 rounded-full bg-gold" />
            </button>
          ))}

        {status.state === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <p className="font-display text-sm">Opening your room…</p>
          </div>
        )}

        {status.state === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-background/90 p-6 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              That image could not be opened. Try a JPG or PNG photo of your room.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor="wipe"
          className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Before
        </label>
        <input
          id="wipe"
          type="range"
          min={0}
          max={100}
          value={wipe}
          onChange={(event) => setWipe(Number(event.target.value))}
          className="h-1 w-full cursor-ew-resize appearance-none bg-border accent-gold"
          aria-label="Compare before and after"
        />
        <span className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          After
        </span>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
