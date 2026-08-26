"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Move,
  RotateCcw,
  Ruler,
  ScanLine,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import {
  DEFAULT_PLACEMENT,
  DEFAULT_QUAD,
  type Placement,
  type Quad,
  type RoomSource,
  type TextureChoice,
} from "@/lib/visualizer/types";
import { MaterialPicker } from "./MaterialPicker";
import { RoomStage, type RoomStageHandle } from "./RoomStage";
import { useFloorDetection, type DetectionState } from "./useFloorDetection";

/** Uploads are read in the browser; anything larger is a phone photo not worth its size. */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type DemoRoom = { src: string; label: string };

/**
 * The room visualizer (§10).
 *
 * Upload a room or pick one of ours, mark where the floor is, and try the real
 * catalogue on it. Everything renders in the browser, so each change is
 * immediate and no photograph leaves the device until the visitor chooses to
 * save one.
 */
export function VisualizerStudio({
  materials,
  demoRooms,
}: {
  materials: TextureChoice[];
  demoRooms: DemoRoom[];
}) {
  const [room, setRoom] = useState<RoomSource>(() => ({
    src: demoRooms[0]?.src ?? "",
    label: demoRooms[0]?.label ?? "Demo room",
  }));
  const [material, setMaterial] = useState<TextureChoice | null>(materials[0] ?? null);
  const [quad, setQuad] = useState<Quad>(DEFAULT_QUAD);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [floorMask, setFloorMask] = useState<CanvasImageSource | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const stageRef = useRef<RoomStageHandle | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const onStageReady = useCallback((handle: RoomStageHandle) => {
    stageRef.current = handle;
  }, []);

  const onDetected = useCallback((detectedQuad: Quad, mask: CanvasImageSource) => {
    setQuad(detectedQuad);
    setFloorMask(mask);
  }, []);

  const detection = useFloorDetection({ photoSrc: room.src, onDetected });

  // Release the previous upload's object URL rather than leaking it.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const applyUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo — a JPG or PNG of your room.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("That photo is very large. Please choose one under 12MB.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setRoom({ src: url, label: file.name, file });
    setQuad(DEFAULT_QUAD);
    setFloorMask(null);
    setShareUrl(null);
    toast.success("Room uploaded — finding your floor.");
  };

  const download = async () => {
    // PNG for the keepsake: it is the visitor's copy of the room, and a second
    // lossy pass over an already-compressed photo shows on flat floor colour.
    const blob = await stageRef.current?.toBlob("image/png");

    if (!blob) {
      toast.error("The preview could not be exported. Try again.");
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `floor-nigeria-${material?.productSlug ?? "visualisation"}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const save = async () => {
    const blob = await stageRef.current?.toBlob();

    if (!blob) {
      toast.error("The preview could not be exported. Try again.");
      return;
    }

    setIsSaving(true);

    try {
      const form = new FormData();
      form.append("result", blob, "visualisation.jpg");
      if (room.file) form.append("source", room.file);
      if (material?.variantId) form.append("product_variant_id", String(material.variantId));
      form.append("settings[scale]", String(placement.tiles / 10));
      form.append("settings[rotation]", String(placement.rotation));
      form.append("settings[opacity]", String(placement.opacity));
      form.append("settings[brightness]", String(placement.brightness));
      quad.forEach((point, index) => {
        form.append(`settings[quad][${index}][x]`, String(point.x));
        form.append(`settings[quad][${index}][y]`, String(point.y));
      });

      const response = await fetch("/api/visualizations", { method: "POST", body: form });
      const payload = (await response.json()) as { share_url?: string; message?: string };

      if (!response.ok || !payload.share_url) {
        throw new Error(payload.message ?? "Save failed");
      }

      setShareUrl(payload.share_url);
      toast.success("Saved. Copy the link to share it.");
    } catch {
      toast.error("We could not save that just now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container-fluid grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <RoomStage
          photoSrc={room.src}
          textureSrc={material?.textureUrl ?? null}
          quad={quad}
          placement={placement}
          mask={floorMask}
          isAdjusting={isAdjusting}
          onQuadChange={setQuad}
          onReady={onStageReady}
        />

        <DetectionNotice state={detection.state} onRetry={detection.retry} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant={isAdjusting ? "default" : "outline"}
            className="h-10 rounded-none"
            onClick={() => setIsAdjusting((current) => !current)}
          >
            <Move className="h-4 w-4" aria-hidden />
            {isAdjusting ? "Done adjusting" : "Adjust floor area"}
          </Button>

          <Button
            variant="ghost"
            className="h-10 rounded-none"
            onClick={() => {
              setQuad(DEFAULT_QUAD);
              setPlacement(DEFAULT_PLACEMENT);
              setFloorMask(null);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset
          </Button>

          <Button variant="ghost" className="h-10 rounded-none" onClick={download}>
            <Download className="h-4 w-4" aria-hidden />
            Download
          </Button>

          <Button
            variant="outline"
            className="h-10 rounded-none"
            onClick={save}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            Save &amp; share
          </Button>
        </div>

        {shareUrl && <ShareLink url={shareUrl} />}

        <p className="mt-6 max-w-2xl text-xs text-muted-foreground">
          This preview is a decision-support tool, not an exact match. Lighting, camera and screen
          differences mean the installed floor will look different — always confirm with a physical
          sample before ordering.
        </p>
      </div>

      <aside className="space-y-8">
        <section>
          <SectionHeading step={1}>Your room</SectionHeading>

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) applyUpload(file);
              event.target.value = "";
            }}
          />

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) applyUpload(file);
              event.target.value = "";
            }}
          />

          <Button
            className="mt-3 h-11 w-full rounded-none"
            onClick={() => uploadRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Upload a photo of your space
          </Button>

          {/* Only offered where there is a camera to open. */}
          <Button
            variant="outline"
            className="mt-2 hidden h-11 w-full rounded-none [@media(pointer:coarse)]:inline-flex"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" aria-hidden />
            Take a photo now
          </Button>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Stand back, keep the camera level and get as much of the floor in shot as you can.
          </p>

          {demoRooms.length > 0 && (
            <>
              <p className="mt-4 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Or try a demo room
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {demoRooms.map((demo) => (
                  <button
                    key={demo.src}
                    type="button"
                    onClick={() => {
                      setRoom(demo);
                      setQuad(DEFAULT_QUAD);
                      setFloorMask(null);
                      setShareUrl(null);
                    }}
                    aria-label={demo.label}
                    title={demo.label}
                    className={cnRoom(room.src === demo.src)}
                    style={{ backgroundImage: `url(${demo.src})` }}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <SectionHeading step={2}>Choose a floor</SectionHeading>
          <div className="mt-3">
            <MaterialPicker
              choices={materials}
              selected={material}
              onSelect={(choice) => {
                setMaterial(choice);
                setShareUrl(null);
              }}
            />
          </div>
        </section>

        <section>
          <SectionHeading step={3}>Fine-tune</SectionHeading>

          <div className="mt-3 space-y-4">
            <Slider
              id="tiles"
              label="Plank size"
              hint={`${placement.tiles} across`}
              min={2}
              max={16}
              step={1}
              value={placement.tiles}
              onChange={(tiles) => setPlacement({ ...placement, tiles })}
            />
            <Slider
              id="rotation"
              label="Direction"
              hint={`${placement.rotation}°`}
              min={-90}
              max={90}
              step={5}
              value={placement.rotation}
              onChange={(rotation) => setPlacement({ ...placement, rotation })}
            />
            <Slider
              id="brightness"
              label="Material brightness"
              hint={`${Math.round(placement.brightness * 100)}%`}
              min={60}
              max={140}
              step={5}
              value={Math.round(placement.brightness * 100)}
              onChange={(value) => setPlacement({ ...placement, brightness: value / 100 })}
            />
            <Slider
              id="lighting"
              label="Room lighting"
              hint={`${Math.round(placement.lighting * 100)}%`}
              min={0}
              max={100}
              step={5}
              value={Math.round(placement.lighting * 100)}
              onChange={(value) => setPlacement({ ...placement, lighting: value / 100 })}
            />
          </div>
        </section>

        {material && (
          <section className="border-t border-border pt-6">
            <p className="font-display text-lg leading-tight">{material.productName}</p>
            {material.variantName && (
              <p className="text-sm text-muted-foreground">{material.variantName}</p>
            )}

            <div className="mt-4 grid gap-2">
              <Button asChild className="h-11 w-full rounded-none">
                <Link href={`/products/${material.productSlug}`}>View this product</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-none">
                <Link href={`/calculator?product=${material.productSlug}`}>
                  <Ruler className="h-4 w-4" aria-hidden />
                  Calculate how much I need
                </Link>
              </Button>
              <a
                href={whatsAppLink(
                  WHATSAPP_NUMBER,
                  orderEnquiry({
                    productName: material.productName,
                    variantName: material.variantName,
                  }),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 border border-border text-sm font-semibold text-[#25D366] transition hover:border-[#25D366] hover:bg-[#25D366]/10"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Ask about this floor
              </a>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

/**
 * What automatic detection is doing, and what to do when it cannot help.
 *
 * Detection is a refinement, never a gate: the room and material are already
 * rendered against a default floor area while this runs, and the corners stay
 * draggable throughout.
 */
function DetectionNotice({ state, onRetry }: { state: DetectionState; onRetry: () => void }) {
  if (state.status === "done") return null;

  if (state.status === "unavailable") {
    return (
      <p className="mt-3 flex flex-wrap items-center gap-2 border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
        <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
        We could not pick out the floor in this photo. Use{" "}
        <strong className="font-semibold text-foreground">Adjust floor area</strong> to mark it, or
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 hover:text-gold"
        >
          try again
        </button>
        .
      </p>
    );
  }

  const { progress } = state;

  return (
    <p
      aria-live="polite"
      className="mt-3 flex items-center gap-2 border border-border bg-surface px-3 py-2 text-sm text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      {progress.stage === "downloading"
        ? `Loading floor detection… ${progress.percent ?? 0}% (one-time, about 3MB)`
        : "Finding the floor in your photo…"}
    </p>
  );
}

function SectionHeading({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="grid h-5 w-5 place-items-center bg-charcoal-dark text-[10px] text-primary-foreground">
        {step}
      </span>
      {children}
    </h2>
  );
}

function Slider({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-1 w-full appearance-none bg-border accent-gold"
      />
    </div>
  );
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border border-gold/40 bg-gold/5 p-3">
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
      <Button
        variant="outline"
        className="h-9 shrink-0 rounded-none"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

function cnRoom(isSelected: boolean): string {
  return [
    "aspect-square bg-cover bg-center transition",
    isSelected
      ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
      : "opacity-80 hover:opacity-100",
  ].join(" ");
}
