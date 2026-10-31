"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minus, Plus } from "lucide-react";
import { beforeAfterImage } from "@/lib/visualizer/compose";
import { canvasToBlob, getTexture, loadImage } from "@/lib/visualizer/images";
import {
  applyEdit,
  simplifyStroke,
  type MaskEdit,
  type MaskMode,
} from "@/lib/visualizer/mask-edits";
import { renderRoom } from "@/lib/visualizer/render";
import {
  QUAD_CORNER_LABELS,
  type MaterialKind,
  type Placement,
  type Point,
  type Quad,
  type SurfaceLayer,
} from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";
import type { DetectionState } from "./useFloorDetection";

/** Arrow-key nudge, as a fraction of the photo. */
const NUDGE = 0.005;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
/** Mask overlay resolution: a guide to paint against, not the mask itself. */
const OVERLAY_MAX_WIDTH = 1024;
/** A tap moves less than this (in CSS pixels) between down and up. */
const TAP_SLOP = 6;
/** How long one floor takes to dissolve into the next, in milliseconds. */
const FADE_MS = 260;

export type CompareMode = "wipe" | "split" | "products";
export type StageTool = "view" | "corners" | "brush" | "polygon" | "smart";

/** A material as the stage needs it: where its texture is and how to lay it. */
export type StageMaterial = {
  textureSrc: string;
  kind: MaterialKind;
  isSeamless: boolean;
  textureSizeM?: number | null;
  label: string;
};

export type RoomStageHandle = {
  /**
   * The rendered room, for downloading or saving. PNG keeps a clean copy for
   * the visitor; JPEG keeps the upload small when saving to the server.
   */
  toBlob: (type?: "image/png" | "image/jpeg") => Promise<Blob | null>;
  /** The original and the visualised room in one labelled image. */
  beforeAfter: (title: string, subtitle?: string | null) => Promise<Blob | null>;
};

/** A material whose image has arrived: the two are only ever swapped together. */
type LoadedTexture = { material: StageMaterial; image: HTMLImageElement };

type View = { scale: number; x: number; y: number };
const IDENTITY: View = { scale: 1, x: 0, y: 0 };

/**
 * The visualizer stage: the room photograph with the chosen material rendered
 * into the floor, three ways to compare, and the tools for correcting where
 * the floor is.
 *
 * Rendering runs on demand rather than per frame — placement changes are
 * discrete, and a phone should not be redrawing a full-resolution canvas sixty
 * times a second (§28). Bursts of changes, like a slider being dragged, are
 * coalesced into one render per animation frame.
 */
export function RoomStage({
  photoSrc,
  material,
  compareMaterial,
  quad,
  placement,
  mask,
  mode,
  tool,
  brush,
  polygonDraft,
  onPolygonDraftChange,
  onQuadChange,
  onMaskEdit,
  onReady,
  onPhotoLoaded,
  onRendered,
  onTextureFailed,
  detection,
  onSmartTap,
  smartBusyAt,
  className,
}: {
  photoSrc: string;
  material: StageMaterial | null;
  /** The second floor, for comparing two products in the same room. */
  compareMaterial: StageMaterial | null;
  quad: Quad;
  placement: Placement;
  /** Floor pixels; when absent the quad bounds the material. */
  mask?: CanvasImageSource | null;
  mode: CompareMode;
  tool: StageTool;
  brush: { mode: MaskMode; size: number };
  polygonDraft: Point[];
  onPolygonDraftChange: (points: Point[]) => void;
  onQuadChange: (quad: Quad) => void;
  onMaskEdit: (edit: MaskEdit) => void;
  /** A tap with the smart select tool, as a share of the photo. */
  onSmartTap?: (point: Point) => void;
  /** Where smart select is working, for a marker while it does. */
  smartBusyAt?: Point | null;
  onReady?: (handle: RoomStageHandle) => void;
  onPhotoLoaded?: (size: { width: number; height: number }) => void;
  /** Automatic floor detection, for the loading overlay. */
  detection?: DetectionState;
  /** Called after a render that showed the chosen material. */
  onRendered?: () => void;
  /** A material's image could not be loaded; the floor before it stays on show. */
  onTextureFailed?: (src: string) => void;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fadeRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const textureRef = useRef<LoadedTexture | null>(null);
  const compareTextureRef = useRef<LoadedTexture | null>(null);
  /** What the main canvas last showed, to tell when the floor has changed. */
  const shownRef = useRef<string | null>(null);

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
  const [view, setView] = useState<View>(IDENTITY);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const [stroke, setStroke] = useState<Point[] | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [aspect, setAspect] = useState(1.6);
  // The room this visitor would rather mark by hand than wait for.
  const [skippedFor, setSkippedFor] = useState<string | null>(null);

  // --- Rendering -------------------------------------------------------------

  // What the next frame should draw. Updated after each commit, read by the
  // frame callback, so a burst of changes renders once with the newest values.
  const latest = useRef({
    quad,
    placement,
    mask,
    material,
    awaitingFloor: false,
    mode,
    onRendered,
  });

  // Until the floor is known there is only a guessed trapezoid to lay material
  // on, and a patch in the middle of a room reads as a broken render. The room
  // stays on show; the floor arrives when it is found, or when the visitor
  // chooses to mark it themselves.
  const isFindingFloor = detection?.status === "running" || detection?.status === "loading";
  const awaitingFloor = !mask && isFindingFloor && skippedFor !== photoSrc && tool !== "corners";

  useLayoutEffect(() => {
    latest.current = { quad, placement, mask, material, awaitingFloor, mode, onRendered };
  });

  const draw = useCallback(() => {
    const photo = photoRef.current;
    if (!photo) return;

    const current = latest.current;
    const layer = (loaded: LoadedTexture | null): SurfaceLayer[] =>
      loaded && !current.awaitingFloor
        ? [
            {
              kind: "floor",
              texture: loaded.image,
              textureKey: loaded.material.textureSrc,
              quad: current.quad,
              placement: current.placement,
              materialKind: loaded.material.kind,
              isSeamless: loaded.material.isSeamless,
              textureSizeM: loaded.material.textureSizeM,
              mask: current.mask,
            },
          ]
        : [];

    const options = {
      photo,
      photoWidth: photo.naturalWidth,
      photoHeight: photo.naturalHeight,
    };

    const loaded = textureRef.current;
    const shown = current.awaitingFloor ? "" : (loaded?.material.textureSrc ?? "");

    if (shownRef.current !== shown) {
      if (shownRef.current !== null && canvasRef.current && fadeRef.current) {
        fadeFrom(canvasRef.current, fadeRef.current);
      }
      shownRef.current = shown;
    }

    if (canvasRef.current) {
      renderRoom(canvasRef.current, {
        ...options,
        surfaces: layer(loaded),
      });
    }

    if (current.mode === "products" && compareCanvasRef.current) {
      renderRoom(compareCanvasRef.current, {
        ...options,
        surfaces: layer(compareTextureRef.current),
      });
    }

    if (loaded && loaded.material.textureSrc === current.material?.textureSrc) {
      current.onRendered?.();
    }
  }, []);

  const frameRef = useRef(0);
  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Load the room photograph.
  useEffect(() => {
    let cancelled = false;

    loadImage(photoSrc)
      .then((image) => {
        if (cancelled) return;
        photoRef.current = image;
        shownRef.current = null;
        setAspect(image.naturalWidth / image.naturalHeight);
        setStatus({ src: photoSrc, state: "ready" });
        onPhotoLoaded?.({ width: image.naturalWidth, height: image.naturalHeight });
        scheduleDraw();
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({ src: photoSrc, state: "error" });
      });

    return () => {
      cancelled = true;
    };
    // `onPhotoLoaded` is a notification; a new one must not reload the photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSrc, scheduleDraw]);

  const textureStatus = useTexture(material, textureRef, scheduleDraw, onTextureFailed);
  useTexture(compareMaterial, compareTextureRef, scheduleDraw, onTextureFailed);

  // Redraw when anything that shapes the picture changes. The mode is included
  // because switching layout mounts fresh canvases.
  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw, quad, placement, mask, material, compareMaterial, mode, awaitingFloor]);

  useEffect(() => {
    onReady?.({
      toBlob: (type = "image/jpeg") =>
        canvasRef.current ? canvasToBlob(canvasRef.current, type, 0.9) : Promise.resolve(null),
      beforeAfter: (title, subtitle) =>
        photoRef.current && canvasRef.current
          ? beforeAfterImage({
              before: photoRef.current,
              after: canvasRef.current,
              title,
              subtitle,
            })
          : Promise.resolve(null),
    });
  }, [onReady]);

  // --- Mask overlay ----------------------------------------------------------

  const isPainting = tool === "brush" || tool === "polygon" || tool === "smart";

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const photo = photoRef.current;

    if (!overlay || !photo || !isPainting) return;

    const width = Math.min(OVERLAY_MAX_WIDTH, photo.naturalWidth);
    const height = Math.round((photo.naturalHeight / photo.naturalWidth) * width);

    if (overlay.width !== width) overlay.width = width;
    if (overlay.height !== height) overlay.height = height;

    const context = overlay.getContext("2d");
    if (!context) return;

    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, width, height);

    if (mask) {
      context.drawImage(mask, 0, 0, width, height);
    } else {
      context.beginPath();
      quad.forEach((point, index) =>
        index === 0
          ? context.moveTo(point.x * width, point.y * height)
          : context.lineTo(point.x * width, point.y * height),
      );
      context.closePath();
      context.fill();
    }

    if (stroke && stroke.length > 0) {
      applyEdit(
        context,
        { type: "brush", mode: brush.mode, size: brush.size, points: stroke },
        width,
        height,
      );
    }

    // Everything opaque becomes the highlight colour.
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "#c9a95c";
    context.fillRect(0, 0, width, height);
  }, [isPainting, mask, quad, stroke, brush.mode, brush.size, status.state]);

  // --- Zoom and pan ----------------------------------------------------------

  const clampView = useCallback((next: View): View => {
    const viewport = viewportRef.current;
    if (!viewport) return next;

    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.scale));
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    return {
      scale,
      x: Math.min(0, Math.max(width - width * scale, next.x)),
      y: Math.min(0, Math.max(height - height * scale, next.y)),
    };
  }, []);

  const zoomAt = useCallback(
    (scale: number, centreX?: number, centreY?: number) => {
      setView((current) => {
        const viewport = viewportRef.current;
        const cx = centreX ?? (viewport?.clientWidth ?? 0) / 2;
        const cy = centreY ?? (viewport?.clientHeight ?? 0) / 2;
        const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
        const ratio = target / current.scale;

        return clampView({
          scale: target,
          x: cx - (cx - current.x) * ratio,
          y: cy - (cy - current.y) * ratio,
        });
      });
    },
    [clampView],
  );

  // A new room starts unzoomed.
  const [viewFor, setViewFor] = useState(photoSrc);
  if (viewFor !== photoSrc) {
    setViewFor(photoSrc);
    setView(IDENTITY);
    setWipe(100);
  }

  // Trackpad pinches and ctrl+wheel zoom; a plain wheel still scrolls the page.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || mode !== "wipe") return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      setView((current) => {
        const target = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, current.scale * Math.exp(-event.deltaY * 0.01)),
        );
        const cx = event.clientX - bounds.left;
        const cy = event.clientY - bounds.top;
        const ratio = target / current.scale;
        return clampView({
          scale: target,
          x: cx - (cx - current.x) * ratio,
          y: cy - (cy - current.y) * ratio,
        });
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [clampView, mode]);

  // --- Pointer handling ------------------------------------------------------

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    kind: "pan" | "pinch" | "stroke" | "tap";
    start: { x: number; y: number };
    view: View;
    distance?: number;
  } | null>(null);

  /** A client position as a fraction of the photograph, zoom included. */
  const toPhoto = (clientX: number, clientY: number): Point | null => {
    const bounds = contentRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return null;
    return { x: (clientX - bounds.left) / bounds.width, y: (clientY - bounds.top) / bounds.height };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "wipe" || event.button > 0) return;

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.current.size === 2) {
      // A second finger turns whatever was happening into a pinch.
      const [a, b] = [...pointers.current.values()];
      setStroke(null);
      gesture.current = {
        kind: "pinch",
        start: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view,
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      };
      return;
    }

    const start = { x: event.clientX, y: event.clientY };

    if (tool === "brush") {
      const point = toPhoto(event.clientX, event.clientY);
      if (point) setStroke([point]);
      gesture.current = { kind: "stroke", start, view };
    } else if (tool === "polygon" || tool === "smart") {
      gesture.current = { kind: "tap", start, view };
    } else if (view.scale > 1) {
      gesture.current = { kind: "pan", start, view };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPainting) setPointer(toPhoto(event.clientX, event.clientY));

    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const current = gesture.current;
    if (!current) return;

    if (current.kind === "pinch" && pointers.current.size >= 2 && current.distance) {
      const [a, b] = [...pointers.current.values()];
      const bounds = viewportRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, current.view.scale * (distance / current.distance)),
      );
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const cx = current.start.x - bounds.left;
      const cy = current.start.y - bounds.top;
      const ratio = scale / current.view.scale;
      setView(
        clampView({
          scale,
          x: cx - (cx - current.view.x) * ratio + (mid.x - current.start.x),
          y: cy - (cy - current.view.y) * ratio + (mid.y - current.start.y),
        }),
      );
    } else if (current.kind === "pan") {
      setView(
        clampView({
          ...current.view,
          x: current.view.x + event.clientX - current.start.x,
          y: current.view.y + event.clientY - current.start.y,
        }),
      );
    } else if (current.kind === "stroke") {
      const point = toPhoto(event.clientX, event.clientY);
      if (point) setStroke((points) => (points ? [...points, point] : [point]));
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    const current = gesture.current;

    if (current?.kind === "stroke" && stroke && stroke.length > 0) {
      onMaskEdit({
        type: "brush",
        mode: brush.mode,
        size: brush.size,
        points: simplifyStroke(stroke),
      });
    }

    if (
      current?.kind === "tap" &&
      Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < TAP_SLOP
    ) {
      if (tool === "smart") {
        const point = toPhoto(event.clientX, event.clientY);
        if (point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
          onSmartTap?.(point);
        }
      } else {
        addPolygonPoint(event.clientX, event.clientY);
      }
    }

    setStroke(null);
    gesture.current = null;
  };

  const addPolygonPoint = (clientX: number, clientY: number) => {
    const point = toPhoto(clientX, clientY);
    if (!point) return;

    const first = polygonDraft[0];
    const bounds = contentRef.current?.getBoundingClientRect();

    // Tapping the first point again closes the shape.
    if (first && polygonDraft.length >= 3 && bounds) {
      const distance = Math.hypot(
        (point.x - first.x) * bounds.width,
        (point.y - first.y) * bounds.height,
      );
      if (distance < 18) {
        onMaskEdit({ type: "polygon", mode: brush.mode, points: polygonDraft });
        onPolygonDraftChange([]);
        return;
      }
    }

    onPolygonDraftChange([...polygonDraft, point]);
  };

  // --- Corners ---------------------------------------------------------------

  const moveCorner = (index: number, point: Point) => {
    const next = [...quad] as Quad;
    next[index] = { x: clamp(point.x, -0.15, 1.15), y: clamp(point.y, -0.15, 1.15) };
    onQuadChange(next);
  };

  // --- Layout ----------------------------------------------------------------

  const photo = (
    // eslint-disable-next-line @next/next/no-img-element -- a canvas-bound photo, not a catalogue asset
    <img src={photoSrc} alt="" className="block w-full select-none" draggable={false} />
  );

  const stageStatus = statusLine(detection, isFindingFloor, textureStatus === "loading", material);

  const overlays = (
    <>
      {status.state !== "error" && stageStatus && (
        <StatusChip
          label={stageStatus}
          // Only the wait for detection can be skipped: the room and tools are
          // already here, and the floor can be marked by hand.
          onSkip={
            awaitingFloor && detection?.status === "running"
              ? () => setSkippedFor(photoSrc)
              : undefined
          }
        />
      )}
      {status.state === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-background/90 p-6 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">
            That image could not be opened. Try a JPG or PNG photo of your room.
          </p>
        </div>
      )}
    </>
  );

  if (mode === "split" || mode === "products") {
    const panels =
      mode === "split"
        ? [
            { label: "Before", content: photo },
            {
              label: material?.label ?? "After",
              content: (
                <>
                  {photo}
                  <canvas
                    ref={canvasRef}
                    aria-label="Your room with the selected floor"
                    className="absolute inset-0 h-full w-full"
                  />
                </>
              ),
            },
          ]
        : [
            {
              label: material?.label ?? "Floor A",
              content: (
                <>
                  {photo}
                  <canvas
                    ref={canvasRef}
                    aria-label={`Your room with ${material?.label ?? "the first floor"}`}
                    className="absolute inset-0 h-full w-full"
                  />
                </>
              ),
            },
            {
              label: compareMaterial?.label ?? "Floor B",
              content: (
                <>
                  {photo}
                  {compareMaterial ? (
                    <canvas
                      ref={compareCanvasRef}
                      aria-label={`Your room with ${compareMaterial.label}`}
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-charcoal-dark/60 p-4 text-center text-sm text-primary-foreground">
                      Choose a second floor to compare
                    </div>
                  )}
                </>
              ),
            },
          ];

    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {panels.map((panel, index) => (
          <figure key={index} className="relative overflow-hidden rounded-lg bg-muted">
            {panel.content}
            <figcaption className="absolute left-2 top-2 max-w-[85%] truncate rounded bg-charcoal-dark/80 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
              {panel.label}
            </figcaption>
            {index === 0 && overlays}
          </figure>
        ))}
      </div>
    );
  }

  const handleScale = 1 / view.scale;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={viewportRef}
        // A room fills its column. On a phone it stays above the floors, so it may
        // only take so much of the screen; on a larger screen only a portrait
        // photograph is narrowed, since at full width it would not fit in view.
        className={cn(
          "relative mx-auto select-none overflow-hidden rounded-lg bg-muted max-lg:max-w-[calc(46dvh*var(--stage-aspect))]",
          aspect < 1 &&
            "lg:max-w-[calc(max(100dvh-var(--header-height)-7rem,26rem)*var(--stage-aspect))]",
        )}
        style={
          {
            "--stage-aspect": aspect,
            touchAction: isPainting || view.scale > 1 || draggingCorner !== null ? "none" : "pan-y",
            cursor: isPainting ? "crosshair" : view.scale > 1 ? "grab" : undefined,
          } as React.CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setPointer(null)}
      >
        <div
          ref={contentRef}
          className="relative origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {photo}

          <canvas
            ref={canvasRef}
            aria-label="Your room with the selected floor applied"
            className="absolute inset-0 h-full w-full"
            style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}
          />

          <canvas
            ref={fadeRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}
          />

          {isPainting && (
            <canvas
              ref={overlayRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
            />
          )}

          {tool === "brush" && pointer && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute rounded-full border-2",
                brush.mode === "add" ? "border-gold" : "border-white",
              )}
              style={{
                left: `${pointer.x * 100}%`,
                top: `${pointer.y * 100}%`,
                width: `${brush.size * 100}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
              }}
            />
          )}

          {tool === "smart" && smartBusyAt && (
            <span
              aria-hidden
              className="pointer-events-none absolute h-8 w-8 animate-ping rounded-full border-2 border-gold motion-reduce:animate-none"
              style={{
                left: `${smartBusyAt.x * 100}%`,
                top: `${smartBusyAt.y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}

          {tool === "polygon" && polygonDraft.length > 0 && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                <polyline
                  points={polygonDraft.map((point) => svgPoint(point)).join(" ")}
                  fill="none"
                  className="stroke-gold"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {polygonDraft.map((point, index) => (
                <circle
                  key={index}
                  cx={`${point.x * 100}%`}
                  cy={`${point.y * 100}%`}
                  r={(index === 0 && polygonDraft.length >= 3 ? 8 : 4) * handleScale}
                  className={index === 0 ? "fill-gold" : "fill-white stroke-gold"}
                />
              ))}
            </svg>
          )}

          {tool === "corners" && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <polygon
                points={quad.map((point) => svgPoint(point)).join(" ")}
                className="fill-gold/10 stroke-gold"
                strokeWidth={2}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {tool === "corners" &&
            quad.map((point, index) => (
              <button
                key={index}
                type="button"
                aria-label={`${QUAD_CORNER_LABELS[index]} of the floor. Drag, or use the arrow keys.`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  (event.target as HTMLElement).setPointerCapture(event.pointerId);
                  setDraggingCorner(index);
                }}
                onPointerMove={(event) => {
                  if (draggingCorner !== index) return;
                  event.stopPropagation();
                  const next = toPhoto(event.clientX, event.clientY);
                  if (next) moveCorner(index, next);
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                  setDraggingCorner(null);
                }}
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
                  moveCorner(index, { x: quad[index].x + delta.x, y: quad[index].y + delta.y });
                }}
                className={cn(
                  "absolute z-10 h-9 w-9 rounded-full border-2 border-gold bg-background/90 shadow-luxe focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  draggingCorner === index ? "cursor-grabbing" : "cursor-grab",
                )}
                style={{
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${handleScale * (draggingCorner === index ? 1.15 : 1)})`,
                }}
              >
                <span className="mx-auto block h-2 w-2 rounded-full bg-gold" />
              </button>
            ))}

          {tool === "view" && wipe < 100 && wipe > 0 && (
            <>
              <WipeLabel side="left">After</WipeLabel>
              <WipeLabel side="right">Before</WipeLabel>
            </>
          )}

          {tool === "view" && wipe < 100 && wipe > 0 && (
            <WipeDivider
              position={wipe}
              scale={handleScale}
              onDrag={(clientX) => {
                const bounds = contentRef.current?.getBoundingClientRect();
                if (bounds) setWipe(clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100));
              }}
            />
          )}
        </div>

        <div
          className="absolute bottom-2 right-2 flex gap-1"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ZoomButton
            label="Zoom out"
            disabled={view.scale <= MIN_ZOOM}
            onClick={() => zoomAt(view.scale / 1.5)}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </ZoomButton>
          <ZoomButton
            label="Zoom in"
            disabled={view.scale >= MAX_ZOOM}
            onClick={() => zoomAt(view.scale * 1.5)}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </ZoomButton>
          {view.scale > 1 && (
            <ZoomButton label="Fit to screen" onClick={() => setView(IDENTITY)}>
              <Maximize2 className="h-4 w-4" aria-hidden />
            </ZoomButton>
          )}
        </div>

        {material && tool === "view" && (
          <p className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-9rem)] truncate rounded bg-charcoal-dark/80 px-2 py-1 text-[11px] font-semibold text-primary-foreground">
            {material.label}
          </p>
        )}

        {overlays}
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
          value={Math.round(wipe)}
          onChange={(event) => setWipe(Number(event.target.value))}
          className="h-1 w-full cursor-ew-resize appearance-none rounded-full bg-border accent-gold"
          aria-label="Compare before and after"
        />
        <span className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          After
        </span>
      </div>
    </div>
  );
}

/** Which side of the line is which: the photograph alone does not say. */
function WipeLabel({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-2 rounded bg-charcoal-dark/80 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      {children}
    </span>
  );
}

/** The before/after line on the photo itself, draggable. */
function WipeDivider({
  position,
  scale,
  onDrag,
}: {
  position: number;
  scale: number;
  onDrag: (clientX: number) => void;
}) {
  return (
    <div className="absolute inset-y-0" style={{ left: `${position}%` }} aria-hidden>
      <div className="absolute inset-y-0 -translate-x-1/2 bg-white" style={{ width: 2 * scale }} />
      <div
        className="absolute top-1/2 grid h-9 w-9 cursor-ew-resize place-items-center rounded-full border-2 border-white bg-charcoal-dark/80 text-[10px] font-bold text-white shadow-luxe"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          (event.target as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if ((event.target as HTMLElement).hasPointerCapture(event.pointerId)) {
            event.stopPropagation();
            onDrag(event.clientX);
          }
        }}
      >
        ⇆
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * Hold the outgoing picture over the new one and dissolve it away, so a change
 * of floor reads as the floor changing rather than as a flicker.
 */
function fadeFrom(canvas: HTMLCanvasElement, fade: HTMLCanvasElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  fade.width = canvas.width;
  fade.height = canvas.height;
  fade.getContext("2d")?.drawImage(canvas, 0, 0);
  fade.animate({ opacity: [1, 0] }, { duration: FADE_MS, easing: "ease-out" });
}

/**
 * Load a material's image and hand it over with the material it belongs to; the
 * newest request wins.
 *
 * The two travel together because the renderer caches its baked tiles by
 * material. While a new image loads the previous pair stays on show: pairing the
 * old image with the new material would bake the old floor under the new
 * floor's name, and it would then stay on screen after the real image landed.
 */
function useTexture(
  material: StageMaterial | null,
  ref: React.RefObject<LoadedTexture | null>,
  onLoaded: () => void,
  onFailed?: (src: string) => void,
): "none" | "loading" | "ready" {
  const src = material?.textureSrc ?? null;
  // The source whose load has settled, so "loading" is derived rather than set
  // synchronously in the effect.
  const [settled, setSettled] = useState<string | null>(null);
  const latestMaterial = useRef(material);

  useLayoutEffect(() => {
    latestMaterial.current = material;
  });

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      ref.current = null;
      onLoaded();
      return;
    }

    getTexture(src)
      .then((image) => {
        if (cancelled || !latestMaterial.current) return;
        ref.current = { material: latestMaterial.current, image };
        setSettled(src);
        onLoaded();
      })
      .catch(() => {
        if (cancelled) return;
        setSettled(src);
        onFailed?.(src);
      });

    return () => {
      cancelled = true;
    };
    // `onFailed` is a notification; a new one must not reload the image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ref, onLoaded]);

  return src === null ? "none" : settled === src ? "ready" : "loading";
}

/** What the stage is waiting for, in a line, or null when it is waiting for nothing. */
function statusLine(
  detection: DetectionState | undefined,
  isFindingFloor: boolean,
  isLoadingTexture: boolean,
  material: StageMaterial | null,
): string | null {
  if (detection?.status === "running") return detectionLabel(detection);
  if (detection?.status === "done" && detection.refining) return "Sharpening the floor's edges";
  if (isLoadingTexture && !isFindingFloor) return `Laying ${material?.label ?? "your floor"}`;
  return null;
}

function detectionLabel(detection: Extract<DetectionState, { status: "running" }>): string {
  const { progress } = detection;

  if (progress.stage === "downloading") {
    return progress.percent
      ? `Getting floor detection ready · ${progress.percent}%`
      : "Getting floor detection ready";
  }

  return progress.stage === "preparing" ? "Starting floor detection" : "Finding your floor";
}

/** Work in progress, in a corner of the room: it never stands in the way of it. */
function StatusChip({ label, onSkip }: { label: string; onSkip?: () => void }) {
  return (
    <div
      className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-full bg-charcoal-dark/85 py-1.5 pl-3 pr-3 text-xs text-primary-foreground"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span role="status" aria-live="polite" className="flex min-w-0 items-center gap-2">
        <Loader2
          className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 font-semibold underline underline-offset-2 hover:text-gold-light"
        >
          Mark it by hand
        </button>
      )}
    </div>
  );
}

/** A photo position in a 100-unit SVG box; `points` takes no percentages. */
function svgPoint(point: Point): string {
  return `${point.x * 100},${point.y * 100}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
