"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import {
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { Minus, Orbit, Pause, Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FOV = { min: 35, max: 90, initial: 75 };

/** Degrees turned per pixel dragged at the initial field of view. */
const DRAG_SPEED = 0.12;

/** Idle drift, in degrees per second. */
const DRIFT = 4;

type View = {
  lon: number;
  lat: number;
  fov: number;
  /** Fling velocity in degrees per millisecond. */
  vLon: number;
  vLat: number;
  rotating: boolean;
  dragging: boolean;
};

/**
 * A look-around viewer for an equirectangular 360° photograph of a floor laid
 * in a room: the photo is mapped inside a sphere around the camera.
 *
 * Drag to look around (flings coast), pinch or scroll to zoom, arrow keys and
 * +/− from the keyboard. It drifts slowly until touched, unless the visitor
 * prefers reduced motion. The scene is held in refs and drawn in its own
 * animation loop, so looking around never re-renders React.
 */
export default function PanoramaViewer({
  url,
  alt,
  tone = "light",
  className,
}: {
  url: string;
  alt: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View>({
    lon: 0,
    lat: 0,
    fov: FOV.initial,
    vLon: 0,
    vLat: 0,
    rotating: true,
    dragging: false,
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rotating, setRotating] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const state = view.current;
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "block h-full w-full";
    element.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(state.fov, 1, 1, 1100);
    const geometry = new SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1); // Face the photo inwards.
    const material = new MeshBasicMaterial();
    scene.add(new Mesh(geometry, material));

    let disposed = false;
    const texture = new TextureLoader().load(
      url,
      () => {
        if (!disposed) setStatus("ready");
      },
      undefined,
      () => {
        if (!disposed) setStatus("error");
      },
    );
    texture.colorSpace = SRGBColorSpace;
    material.map = texture;

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    // Zoom by wheel or trackpad pinch; must be non-passive to stop page zoom.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      state.fov = MathUtils.clamp(state.fov + event.deltaY * 0.05, FOV.min, FOV.max);
    };
    element.addEventListener("wheel", onWheel, { passive: false });

    const target = new Vector3();
    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      if (!state.dragging) {
        if (Math.abs(state.vLon) > 0.0005 || Math.abs(state.vLat) > 0.0005) {
          state.lon += state.vLon * dt;
          state.lat += state.vLat * dt;
          state.vLon *= Math.pow(0.93, dt / 16);
          state.vLat *= Math.pow(0.93, dt / 16);
        } else if (state.rotating) {
          state.lon += (DRIFT * dt) / 1000;
        }
      }

      state.lat = MathUtils.clamp(state.lat, -85, 85);
      const phi = MathUtils.degToRad(90 - state.lat);
      const theta = MathUtils.degToRad(state.lon);
      target.setFromSphericalCoords(1, phi, theta);
      camera.lookAt(target);
      if (camera.fov !== state.fov) {
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("wheel", onWheel);
      texture.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url]);

  // Pointer handling: one pointer drags, two pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ lastT: 0, pinch: 0 });

  function stopDrift() {
    view.current.rotating = false;
    setRotating(false);
    setTouched(true);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const state = view.current;
    state.dragging = true;
    state.vLon = 0;
    state.vLat = 0;
    gesture.current.lastT = event.timeStamp;
    if (pointers.current.size === 2) gesture.current.pinch = pinchDistance();
    stopDrift();
  }

  function pinchDistance() {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const state = view.current;

    if (pointers.current.size >= 2) {
      const distance = pinchDistance();
      if (gesture.current.pinch > 0) {
        state.fov = MathUtils.clamp(
          state.fov * (gesture.current.pinch / distance),
          FOV.min,
          FOV.max,
        );
      }
      gesture.current.pinch = distance;
      return;
    }

    const speed = DRAG_SPEED * (state.fov / FOV.initial);
    const dLon = -(event.clientX - previous.x) * speed;
    const dLat = (event.clientY - previous.y) * speed;
    state.lon += dLon;
    state.lat += dLat;

    const dt = Math.max(event.timeStamp - gesture.current.lastT, 1);
    gesture.current.lastT = event.timeStamp;
    state.vLon = dLon / dt;
    state.vLat = dLat / dt;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    gesture.current.pinch = 0;
    if (pointers.current.size > 0) return;
    const state = view.current;
    state.dragging = false;
    // A drag that ended still (or a reduced-motion visitor) shouldn't coast.
    if (reduceMotion || event.timeStamp - gesture.current.lastT > 80) {
      state.vLon = 0;
      state.vLat = 0;
    }
  }

  function zoom(by: number) {
    const state = view.current;
    state.fov = MathUtils.clamp(state.fov + by, FOV.min, FOV.max);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const state = view.current;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => (state.lon -= 6),
      ArrowRight: () => (state.lon += 6),
      ArrowUp: () => (state.lat += 6),
      ArrowDown: () => (state.lat -= 6),
      "+": () => zoom(-8),
      "=": () => zoom(-8),
      "-": () => zoom(8),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    event.stopPropagation();
    stopDrift();
    move();
  }

  const drifting = rotating && !reduceMotion;

  useEffect(() => {
    view.current.rotating = drifting;
  }, [drifting]);

  const dark = tone === "dark";
  const control = cn(
    "grid h-9 w-9 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
    dark ? "text-white hover:bg-white/15" : "hover:bg-muted",
  );

  return (
    <div className={cn("relative h-full w-full select-none bg-charcoal-dark", className)}>
      <div
        ref={host}
        role="img"
        tabIndex={0}
        aria-label={`${alt}. Drag or use the arrow keys to look around; + and − to zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute inset-0 cursor-grab touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold active:cursor-grabbing"
      />

      {status !== "ready" && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white/80">
          {status === "loading" ? "Loading 360° room view…" : "This 360° view couldn't be loaded."}
        </p>
      )}

      {status === "ready" && !touched && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto flex w-max -translate-y-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <Orbit className="h-4 w-4" aria-hidden />
          Drag to look around
        </p>
      )}

      <div
        className={cn(
          "absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full p-1 shadow-lg",
          dark ? "bg-white/10" : "bg-background/95",
        )}
      >
        <button type="button" className={control} onClick={() => zoom(8)} aria-label="Zoom out">
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={control}
          onClick={() => {
            setTouched(true);
            setRotating((current) => !current);
          }}
          disabled={Boolean(reduceMotion)}
          aria-label={drifting ? "Stop turning" : "Turn slowly"}
        >
          {drifting ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button type="button" className={control} onClick={() => zoom(-8)} aria-label="Zoom in">
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
