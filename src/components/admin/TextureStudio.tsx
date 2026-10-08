"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, ImageUp, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/visualizer/images";
import {
  centredSquare,
  evenLighting,
  makeSeamless,
  outputSide,
  rectify,
  type Pixels,
} from "@/lib/visualizer/texture-prep";
import type { Point, Quad } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

type Texture = { url: string; size_m: number | null; updated_at: string | null };

type Item = {
  id: number;
  name: string;
  slug: string;
  sku_family: string | null;
  category: string | null;
  thumb_url: string | null;
  texture: Texture | null;
  sources: { url: string; label: string; variant_id: number | null }[];
  variants: { id: number; name: string; sku: string; texture: Texture | null }[];
};

type Listing = {
  data: Item[];
  meta: { current_page: number; last_page: number; total: number; with_texture: number };
};

type Status = "" | "missing" | "set";

/** Seam blending trims this share from each axis; the saved size accounts for it. */
const SEAM_BAND = 0.15;

/** Previews are worked at this size; the full-resolution version is made on save. */
const PREVIEW_SIDE = 640;

/** Largest side read from a photo — enough for a 2048px texture from a close crop. */
const MAX_SOURCE_SIDE = 3200;

/**
 * The admin tool for visualizer textures (§24).
 *
 * Choose a product (and, when colours differ, a variation), pick one of its
 * photos or upload a better one, and drag four corners onto a square patch of
 * the material. The patch is straightened with the same homography the
 * visualizer uses, its lighting evened out, its edges blended so it repeats
 * without a seam — previewed tiled — and saved with its real size, so the
 * visualizer lays it at true scale.
 */
export function TextureStudio() {
  const [query, setQuery] = useState({ q: "", status: "" as Status, page: 1 });
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const load = useCallback(async (next: typeof query) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(next.page) });
      if (next.q.trim()) params.set("q", next.q.trim());
      if (next.status) params.set("status", next.status);
      const response = await fetch(`/api/admin/visualizer-textures?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      setListing((await response.json()) as Listing);
    } catch {
      toast.error("Products could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(query), query.q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const selected = listing?.data.find((item) => item.slug === selectedSlug) ?? null;

  const replaceItem = (item: Item) =>
    setListing((current) =>
      current
        ? { ...current, data: current.data.map((entry) => (entry.id === item.id ? item : entry)) }
        : current,
    );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="texture-search" className="sr-only">
            Search products
          </label>
          <input
            id="texture-search"
            type="search"
            value={query.q}
            onChange={(event) => setQuery({ ...query, q: event.target.value, page: 1 })}
            placeholder="Search name or SKU"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold"
          />
        </div>

        <div role="radiogroup" aria-label="Show" className="flex gap-1">
          {(
            [
              ["", "All"],
              ["missing", "Needs texture"],
              ["set", "Done"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={query.status === value}
              onClick={() => setQuery({ ...query, status: value, page: 1 })}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold transition",
                query.status === value
                  ? "bg-charcoal text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {listing && (
          <p className="text-xs text-muted-foreground">
            {listing.meta.with_texture} of {listing.meta.total} products have a texture.
          </p>
        )}

        <ul className={cn("space-y-1", isLoading && "opacity-60")} aria-busy={isLoading}>
          {listing?.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedSlug(item.slug)}
                aria-current={item.slug === selectedSlug}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-2 text-left transition",
                  item.slug === selectedSlug
                    ? "bg-background shadow-sm ring-1 ring-gold"
                    : "hover:bg-background",
                )}
              >
                <span
                  className="h-11 w-11 shrink-0 rounded bg-muted bg-cover bg-center"
                  style={item.thumb_url ? { backgroundImage: `url(${item.thumb_url})` } : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.category ?? item.sku_family ?? ""}
                  </span>
                </span>
                {item.texture || item.variants.some((variant) => variant.texture) ? (
                  <Check className="h-4 w-4 shrink-0 text-gold" aria-label="Has a texture" />
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Missing
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {listing && listing.meta.last_page > 1 && (
          <div className="flex items-center justify-between text-xs">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1}
              onClick={() => setQuery({ ...query, page: query.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {listing.meta.current_page} of {listing.meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= listing.meta.last_page}
              onClick={() => setQuery({ ...query, page: query.page + 1 })}
            >
              Next
            </Button>
          </div>
        )}
      </aside>

      <section className="min-w-0 rounded-lg border border-border bg-background p-4 sm:p-6">
        {selected ? (
          <TextureEditor key={selected.id} item={selected} onSaved={replaceItem} />
        ) : (
          <div className="grid min-h-80 place-items-center text-center text-sm text-muted-foreground">
            <p>
              Choose a product to prepare its texture.
              <br />
              Start with the ones marked <strong>Missing</strong>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function TextureEditor({ item, onSaved }: { item: Item; onSaved: (item: Item) => void }) {
  const [variantId, setVariantId] = useState<number | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(item.sources[0]?.url ?? null);
  const [sourceLabel, setSourceLabel] = useState(item.sources[0]?.label ?? "");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [sizeM, setSizeM] = useState("1.0");
  const [evenLight, setEvenLight] = useState(true);
  const [seamless, setSeamless] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadUrlRef = useRef<string | null>(null);

  const current =
    variantId === null
      ? item.texture
      : (item.variants.find((variant) => variant.id === variantId)?.texture ?? null);

  useEffect(
    () => () => {
      if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    },
    [],
  );

  // Load the chosen photo and start from a square in its middle.
  useEffect(() => {
    let cancelled = false;
    if (!sourceUrl) return;

    loadImage(sourceUrl)
      .then((loaded) => {
        if (cancelled) return;
        setImage(loaded);
        setQuad(centredSquare(loaded.naturalWidth, loaded.naturalHeight));
      })
      .catch(() => !cancelled && toast.error("That photo could not be opened."));

    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  const pixels = useMemo(() => (image ? readPixels(image) : null), [image]);

  const options = useMemo(() => ({ evenLight, seamless }), [evenLight, seamless]);

  // Preview, a moment after the corners stop moving.
  useEffect(() => {
    if (!pixels || !quad) return;

    const timer = setTimeout(() => {
      const canvas = prepare(pixels, quad, options, PREVIEW_SIDE);
      setPreview(canvas.toDataURL("image/jpeg", 0.85));
    }, 180);

    return () => clearTimeout(timer);
  }, [pixels, quad, options]);

  const save = async () => {
    if (!pixels || !quad) return;

    const metres = Number(sizeM);

    if (!(metres >= 0.05 && metres <= 10)) {
      toast.error("Enter how much floor the square shows, between 0.05 and 10 metres.");
      return;
    }

    setIsSaving(true);
    // Let the button show it is working before the full-size pass takes the
    // main thread for a moment.
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const canvas = prepare(pixels, quad, options, outputSide(scaledQuad(quad, pixels.scale)));
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );

      if (!blob) throw new Error("Export failed");

      const form = new FormData();
      form.append("texture", blob, `${item.slug}.jpg`);
      // Blending the seam trims the square, so the saved texture shows a little
      // less floor than was marked.
      form.append(
        "size_m",
        String(Math.round(metres * (seamless ? 1 - SEAM_BAND : 1) * 1000) / 1000),
      );
      form.append("prepared_from", sourceLabel.slice(0, 255));
      if (variantId !== null) form.append("variant_id", String(variantId));

      const response = await fetch(`/api/admin/visualizer-textures/${item.slug}`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: Item;
        message?: string;
      };

      if (!response.ok || !payload.data) throw new Error(payload.message ?? "Save failed");

      onSaved(payload.data);
      toast.success("Texture saved. The visualizer uses it straight away.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The texture could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    const params = variantId !== null ? `?variant_id=${variantId}` : "";
    const response = await fetch(`/api/admin/visualizer-textures/${item.slug}${params}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => ({}))) as { data?: Item };

    if (!response.ok || !payload.data) {
      toast.error("The texture could not be removed.");
      return;
    }

    onSaved(payload.data);
    toast.success("Texture removed. The visualizer falls back to the product photo.");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl leading-tight">{item.name}</h2>
          <p className="text-xs text-muted-foreground">
            {[item.category, item.sku_family].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link
          href={`/visualizer?product=${item.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2"
        >
          Open in the visualizer
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </header>

      {item.variants.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold">Texture for</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TargetChip
              active={variantId === null}
              done={Boolean(item.texture)}
              onClick={() => setVariantId(null)}
            >
              All colours
            </TargetChip>
            {item.variants.map((variant) => (
              <TargetChip
                key={variant.id}
                active={variantId === variant.id}
                done={Boolean(variant.texture)}
                onClick={() => setVariantId(variant.id)}
              >
                {variant.name}
              </TargetChip>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            A colour with its own texture uses it; the others use the &ldquo;All colours&rdquo; one.
          </p>
        </fieldset>
      )}

      {current && (
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <span
            className="h-14 w-14 shrink-0 rounded bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${current.url})` }}
          />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            Current texture{current.size_m ? ` · shows ${current.size_m} m across` : ""}. Saving
            replaces it.
          </p>
          <Button variant="ghost" size="sm" onClick={() => void remove()}>
            <Trash2 aria-hidden />
            Remove
          </Button>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">1. Choose a photo</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.sources.map((source) => (
            <button
              key={source.url}
              type="button"
              onClick={() => {
                setSourceUrl(source.url);
                setSourceLabel(source.label);
              }}
              title={source.label}
              aria-label={`Use ${source.label}`}
              aria-pressed={sourceUrl === source.url}
              className={cn(
                "h-16 w-16 rounded bg-muted bg-cover bg-center transition",
                sourceUrl === source.url
                  ? "ring-2 ring-gold ring-offset-2"
                  : "opacity-80 hover:opacity-100",
              )}
              style={{ backgroundImage: `url(${source.url})` }}
            />
          ))}
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="grid h-16 w-16 place-items-center rounded border border-dashed border-border text-muted-foreground hover:border-foreground"
            aria-label="Upload a photo"
            title="Upload a photo"
          >
            <ImageUp className="h-5 w-5" aria-hidden />
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
              uploadUrlRef.current = URL.createObjectURL(file);
              setSourceUrl(uploadUrlRef.current);
              setSourceLabel(`Upload: ${file.name}`);
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          The best photo is a close, evenly lit shot of the material itself — a sample board or an
          installed floor photographed from above.
        </p>
      </fieldset>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <p className="text-sm font-semibold">2. Mark a square patch of the material</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Drag the corners onto the corners of a square area of floor — one tile, or a square of
            planks. Keep skirting, props and shadows out. A slanted photo is straightened.
          </p>
          {image && quad ? (
            <CornerEditor image={image} quad={quad} onChange={setQuad} />
          ) : (
            <div className="mt-3 grid aspect-[4/3] place-items-center rounded-md bg-muted text-sm text-muted-foreground">
              {sourceUrl ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                "Choose or upload a photo"
              )}
            </div>
          )}
          {image && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setQuad(centredSquare(image.naturalWidth, image.naturalHeight))}
            >
              <RotateCcw aria-hidden />
              Reset corners
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold">3. Check it repeats</p>
            <div
              className="mt-2 aspect-square rounded-md border border-border bg-muted"
              style={
                preview
                  ? { backgroundImage: `url(${preview})`, backgroundSize: "33.333% 33.333%" }
                  : undefined
              }
              role="img"
              aria-label="The texture repeated three by three"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Repeated 3 × 3. Look for seams or a bright patch that repeats.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={evenLight}
              onChange={(event) => setEvenLight(event.target.checked)}
              className="mt-1 accent-gold"
            />
            <span>
              Even out the lighting
              <span className="block text-[11px] text-muted-foreground">
                Removes a window&apos;s glow from one side.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={seamless}
              onChange={(event) => setSeamless(event.target.checked)}
              className="mt-1 accent-gold"
            />
            <span>
              Blend the edges
              <span className="block text-[11px] text-muted-foreground">
                So it repeats without a visible seam.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">4. Real size of the square</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0.05}
                max={10}
                step={0.05}
                value={sizeM}
                onChange={(event) => setSizeM(event.target.value)}
                className="h-10 w-24 rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-gold"
              />
              <span className="text-sm text-muted-foreground">metres across</span>
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              E.g. one 600mm tile is 0.6; three 183mm planks side by side are 0.55. Lets the
              visualizer lay it at true scale.
            </span>
          </label>

          <Button className="h-11 w-full" disabled={!quad || isSaving} onClick={() => void save()}>
            {isSaving && <Loader2 className="animate-spin" aria-hidden />}
            Save texture
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The photo with four draggable corners, in the photo's own pixel space. */
function CornerEditor({
  image,
  quad,
  onChange,
}: {
  image: HTMLImageElement;
  quad: Quad;
  onChange: (quad: Quad) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const move = (index: number, clientX: number, clientY: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    const next = [...quad] as Quad;
    next[index] = {
      x: Math.min(width, Math.max(0, ((clientX - bounds.left) / bounds.width) * width)),
      y: Math.min(height, Math.max(0, ((clientY - bounds.top) / bounds.height) * height)),
    };
    onChange(next);
  };

  const nudge = (index: number, delta: Point) => {
    const next = [...quad] as Quad;
    next[index] = {
      x: Math.min(width, Math.max(0, next[index].x + delta.x)),
      y: Math.min(height, Math.max(0, next[index].y + delta.y)),
    };
    onChange(next);
  };

  const step = Math.max(1, Math.round(Math.max(width, height) / 400));
  const labels = ["Top left", "Top right", "Bottom right", "Bottom left"];

  return (
    <div
      ref={ref}
      className="relative mt-3 select-none overflow-hidden rounded-md bg-muted"
      style={{ touchAction: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the photo being cropped, at its own size */}
      <img src={image.src} alt="" className="block w-full" draggable={false} />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d={`M0 0H${width}V${height}H0Z M${quad.map((point) => `${point.x} ${point.y}`).join(" L")}Z`}
          fillRule="evenodd"
          className="fill-black/45"
        />
        <polygon
          points={quad.map((point) => `${point.x},${point.y}`).join(" ")}
          className="fill-none stroke-gold"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {/* Thirds, to line up with plank joints. */}
        {[1 / 3, 2 / 3].map((t) => (
          <g key={t} className="stroke-white/60" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <line
              x1={lerp(quad[0], quad[3], t).x}
              y1={lerp(quad[0], quad[3], t).y}
              x2={lerp(quad[1], quad[2], t).x}
              y2={lerp(quad[1], quad[2], t).y}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={lerp(quad[0], quad[1], t).x}
              y1={lerp(quad[0], quad[1], t).y}
              x2={lerp(quad[3], quad[2], t).x}
              y2={lerp(quad[3], quad[2], t).y}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      {quad.map((point, index) => (
        <button
          key={index}
          type="button"
          aria-label={`${labels[index]} corner. Drag, or use the arrow keys.`}
          onPointerDown={(event) => {
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
            setDragging(index);
          }}
          onPointerMove={(event) => dragging === index && move(index, event.clientX, event.clientY)}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          onKeyDown={(event) => {
            const deltas: Record<string, Point> = {
              ArrowLeft: { x: -step, y: 0 },
              ArrowRight: { x: step, y: 0 },
              ArrowUp: { x: 0, y: -step },
              ArrowDown: { x: 0, y: step },
            };
            const delta = deltas[event.key];
            if (!delta) return;
            event.preventDefault();
            nudge(index, delta);
          }}
          className={cn(
            "absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-background/90 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            dragging === index ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}
        >
          <span className="mx-auto block h-2 w-2 rounded-full bg-gold" />
        </button>
      ))}
    </div>
  );
}

function TargetChip({
  active,
  done,
  onClick,
  children,
}: {
  active: boolean;
  done: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition",
        active
          ? "border-charcoal bg-charcoal text-primary-foreground"
          : "border-border hover:border-foreground/40",
      )}
    >
      {done && <Check className="h-3 w-3" aria-label="has a texture" />}
      {children}
    </button>
  );
}

// --- Image work ----------------------------------------------------------------

type SourcePixels = Pixels & { scale: number };

/** The photo's pixels, capped in size; `scale` maps photo pixels to these. */
function readPixels(image: HTMLImageElement): SourcePixels | null {
  const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return null;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  try {
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    return { data, width, height, scale };
  } catch {
    toast.error("That photo cannot be read from this page. Download it and upload it instead.");
    return null;
  }
}

function scaledQuad(quad: Quad, scale: number): Quad {
  return quad.map((point) => ({ x: point.x * scale, y: point.y * scale })) as Quad;
}

/** Straighten, even out and blend, at the given side length. */
function prepare(
  source: SourcePixels,
  quad: Quad,
  options: { evenLight: boolean; seamless: boolean },
  side: number,
): HTMLCanvasElement {
  let result = rectify(source, scaledQuad(quad, source.scale), side);

  if (options.evenLight) result = evenLighting(result, illuminationOf(result));
  if (options.seamless) result = makeSeamless(result, SEAM_BAND);

  return toCanvas(result);
}

/**
 * Brightness far beyond any grain: the texture shrunk to a few pixels by
 * repeated halving — an average, not a sample — and smoothly enlarged back.
 */
function illuminationOf(image: Pixels): Pixels {
  let canvas = toCanvas(image);

  while (canvas.width > 12) {
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(6, Math.round(canvas.width / 2));
    smaller.height = Math.max(6, Math.round(canvas.height / 2));
    smaller.getContext("2d")?.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    canvas = smaller;
  }

  const full = document.createElement("canvas");
  full.width = image.width;
  full.height = image.height;
  const context = full.getContext("2d", { willReadFrequently: true });

  if (!context) return image;

  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, full.width, full.height);
  const { data, width, height } = context.getImageData(0, 0, full.width, full.height);

  return { data, width, height };
}

function toCanvas(image: Pixels): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas
    .getContext("2d")
    ?.putImageData(
      new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
      0,
      0,
    );
  return canvas;
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
