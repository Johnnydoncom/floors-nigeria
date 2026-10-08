"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  Camera,
  Check,
  Columns2,
  Eraser,
  Layers,
  Move,
  PenTool,
  Plus,
  RotateCcw,
  ScanLine,
  Share2,
  SplitSquareHorizontal,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { track } from "@/lib/analytics";
import type { ProductCard, Variant } from "@/lib/api/types";
import { arSpecFor } from "@/lib/room/ar-material";
import { choiceForVariant, toTextureChoices } from "@/lib/room/materials";
import { absoluteUrl } from "@/lib/structured-data";
import { prepareRoomPhoto } from "@/lib/visualizer/images";
import { library, materialKey, useLibrary } from "@/lib/visualizer/library";
import {
  composeMask,
  parseMaskEdits,
  type MaskEdit,
  type MaskMode,
} from "@/lib/visualizer/mask-edits";
import { defaultDimensions, LAYOUT_LABELS, layoutsFor } from "@/lib/visualizer/patterns";
import {
  DEFAULT_PLACEMENT,
  DEFAULT_QUAD,
  type LayoutPattern,
  type Placement,
  type Point,
  type Quad,
  type RoomSource,
  type TextureChoice,
} from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";
import { AdjustPanel, Chip, Slider } from "./AdjustPanel";
import { ArLauncher } from "./ArLauncher";
import { LeadDialog, type LeadKind } from "./LeadDialog";
import { MaterialBrowser, toggleFavorite, type VisualizerFilters } from "./MaterialBrowser";
import { MaterialDetails } from "./MaterialDetails";
import {
  RoomStage,
  type CompareMode,
  type RoomStageHandle,
  type StageMaterial,
  type StageTool,
} from "./RoomStage";
import { ShareDialog } from "./ShareDialog";
import { useFloorDetection, type DetectionState } from "./useFloorDetection";

/** Anything larger is not a room photo; it would only be downscaled anyway. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type SampleRoom = { src: string; label: string };

type Panel = "floors" | "adjust" | "room";
type Share = { key: string; url: string; token: string };

/**
 * The room visualizer (§10).
 *
 * Choose a floor, put it in a room — your own photo or one of ours — and the
 * floor is found automatically. Then lay it how you would lay it, compare it,
 * keep it, share it, and ask for a quote or a sample without leaving the room.
 *
 * Everything renders in the browser, so each change is immediate and no
 * photograph leaves the device until the visitor chooses to save or send one.
 */
export function VisualizerStudio({
  materials,
  sampleRooms,
  filters,
}: {
  materials: TextureChoice[];
  sampleRooms: SampleRoom[];
  filters: VisualizerFilters;
}) {
  const searchParams = useSearchParams();
  const linkedProduct = searchParams.get("product");
  const linkedVariant = searchParams.get("variant");
  const linkedDesign = searchParams.get("design");

  const [room, setRoom] = useState<RoomSource>(() => ({
    src: sampleRooms[0]?.src ?? "",
    label: sampleRooms[0]?.label ?? "Sample room",
    origin: "sample",
  }));
  const [material, setMaterial] = useState<TextureChoice | null>(materials[0] ?? null);
  const [compareMaterial, setCompareMaterial] = useState<TextureChoice | null>(null);
  const [placement, setPlacement] = useState<Placement>(() =>
    placementFor(materials[0] ?? null, DEFAULT_PLACEMENT, false),
  );
  const [layoutPinned, setLayoutPinned] = useState(false);
  const [quad, setQuad] = useState<Quad>(DEFAULT_QUAD);
  const [detectedMask, setDetectedMask] = useState<HTMLCanvasElement | null>(null);
  const [maskEdits, setMaskEdits] = useState<MaskEdit[]>([]);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);

  const [mode, setMode] = useState<CompareMode>("wipe");
  const [tool, setTool] = useState<StageTool>("view");
  const [brush, setBrush] = useState<{ mode: MaskMode; size: number }>({ mode: "add", size: 0.05 });
  const [polygonDraft, setPolygonDraft] = useState<Point[]>([]);
  const [panel, setPanel] = useState<Panel>(linkedProduct || linkedDesign ? "room" : "floors");
  const [compareSlot, setCompareSlot] = useState<"a" | "b">("b");

  const [share, setShare] = useState<Share | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [lead, setLead] = useState<LeadKind | null>(null);
  const [areaSqm, setAreaSqm] = useState<number | null>(null);

  const stageRef = useRef<RoomStageHandle | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  /** A reopened design keeps its own corners; detection only supplies the mask. */
  const keepQuadRef = useRef(false);
  const completedRef = useRef(new Set<string>());

  const { favorites } = useLibrary();

  // --- Floor detection -------------------------------------------------------

  const onDetected = useCallback((detectedQuad: Quad, mask: CanvasImageSource) => {
    if (!keepQuadRef.current) setQuad(detectedQuad);
    keepQuadRef.current = false;
    setDetectedMask(mask as HTMLCanvasElement);
  }, []);

  const detection = useFloorDetection({ photoSrc: room.src, onDetected });

  useEffect(() => {
    if (detection.state.status === "done")
      track("floor_detected", { origin: room.origin ?? "sample" });
    if (detection.state.status === "unavailable")
      track("floor_detection_failed", { origin: room.origin ?? "sample" });
  }, [detection.state.status, room.origin]);

  /** The floor area: detection, with every hand correction applied. */
  const mask = useMemo(
    () =>
      (photoSize &&
        composeMask(detectedMask, quad, maskEdits, photoSize.width, photoSize.height)) ??
      detectedMask,
    [detectedMask, maskEdits, photoSize, quad],
  );

  // --- Arrival ---------------------------------------------------------------

  useEffect(() => {
    track("visualizer_opened", {
      source: linkedDesign ? "design" : linkedProduct ? "product" : "direct",
      product: linkedProduct,
    });
    // Once per visit, with the link the page was opened from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Room ------------------------------------------------------------------

  // Release the last upload's object URL rather than leaking it.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const changeRoom = (next: RoomSource) => {
    setRoom(next);
    setQuad(DEFAULT_QUAD);
    setDetectedMask(null);
    setMaskEdits([]);
    setPolygonDraft([]);
    setPhotoSize(null);
    setTool("view");
    track("room_selected", {
      origin: next.origin ?? "sample",
      label: next.origin === "sample" ? next.label : undefined,
    });
  };

  const applyUpload = async (file: File, origin: "upload" | "camera") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo — a JPG or PNG of your room.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("That file is very large. Please choose a photo under 25MB.");
      return;
    }

    try {
      const prepared = await prepareRoomPhoto(file);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = prepared.url;

      keepQuadRef.current = false;
      changeRoom({ src: prepared.url, label: file.name, file: prepared.file, origin });
      toast.success("Room added — finding your floor.");
    } catch {
      toast.error("That photo could not be opened. Try a JPG or PNG.");
    }
  };

  // --- Material --------------------------------------------------------------

  const chooseMaterial = (choice: TextureChoice, via: "browser" | "link" = "browser") => {
    if (mode === "products" && compareSlot === "b" && via === "browser") {
      setCompareMaterial(choice);
      track("comparison_used", { mode: "products", product: choice.productSlug });
      return;
    }

    setMaterial(choice);
    setPlacement((current) => placementFor(choice, current, layoutPinned));
    library.viewed(choice);
    track("product_selected", {
      product: choice.productSlug,
      finish: choice.variantName,
      via,
      kind: choice.kind,
    });
  };

  const changeLayout = (layout: LayoutPattern) => {
    setLayoutPinned(true);
    setPlacement((current) => ({ ...current, layout }));
    track("layout_changed", { layout, product: material?.productSlug });
  };

  const productDimensions = useMemo(() => dimensionsOf(material), [material]);

  // --- Links in: a product page, a shared design -----------------------------

  const loadLinkedProduct = async (slug: string, sku: string | null) => {
    try {
      const params = new URLSearchParams({ product: slug });
      if (sku) params.set("variant", sku);
      const response = await fetch(`/api/catalog/materials?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as { data: TextureChoice[]; selected: number };
      const choice = payload.data[payload.selected] ?? payload.data[0];
      if (choice) chooseMaterial(choice, "link");
    } catch {
      toast.error("That floor could not be loaded. Choose one from the list.");
    }
  };

  const restoreDesign = async (token: string) => {
    try {
      const response = await fetch(`/api/visualizations/${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error(String(response.status));

      const { data } = (await response.json()) as {
        data: {
          source_url: string | null;
          settings: Record<string, unknown>;
          product?: ProductCard;
          variant?: Variant;
        };
      };

      const settings = data.settings ?? {};
      const sampleSrc =
        typeof settings.room === "string" && settings.room.startsWith("/images/")
          ? settings.room
          : null;
      const src = data.source_url ?? sampleSrc;

      if (!src) throw new Error("No room photo");

      let choice: TextureChoice | null = null;

      if (data.product) {
        const label = typeof settings.finish_label === "string" ? settings.finish_label : null;
        choice =
          (label && toTextureChoices(data.product).find((entry) => entry.variantName === label)) ||
          choiceForVariant(data.product, data.variant ?? null);
      }

      const savedQuad = parseQuad(settings.quad);
      keepQuadRef.current = savedQuad !== null;

      changeRoom({ src, label: "Saved design", origin: "design" });
      if (savedQuad) setQuad(savedQuad);
      setMaskEdits(parseMaskEdits(settings.mask_edits));

      if (choice) {
        setMaterial(choice);
        library.viewed(choice);
      }

      setPlacement((current) => restorePlacement(settings, placementFor(choice, current, false)));
      setLayoutPinned(typeof settings.layout === "string");
      setPanel("floors");
    } catch {
      toast.error("That design could not be opened. It may have been deleted.");
    }
  };

  // Follow the link — on arrival, and when a saved design is opened from the
  // Room panel without leaving the page.
  useEffect(() => {
    // Deferred to a microtask: loading is a background job that reports
    // through state, not something to do in the effect body itself.
    void Promise.resolve().then(() => {
      if (linkedDesign) return restoreDesign(linkedDesign);
      if (linkedProduct) return loadLinkedProduct(linkedProduct, linkedVariant);
    });
    // The loaders read state through setters only; the link alone decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDesign, linkedProduct, linkedVariant]);

  // --- Floor area edits ------------------------------------------------------

  const selectTool = (next: StageTool) => {
    setTool((current) => (current === next ? "view" : next));
    setPolygonDraft([]);
    if (next !== "view") setMode("wipe");
  };

  const addMaskEdit = (edit: MaskEdit) => {
    setMaskEdits((current) => [...current, edit]);
    track("floor_area_edited", { tool: edit.type, mode: edit.mode });
  };

  // --- Save, share, export ---------------------------------------------------

  const designKey = JSON.stringify([
    room.src,
    material ? materialKey(material) : null,
    placement,
    quad,
    maskEdits.length,
  ]);
  const shareUrl = share?.key === designKey ? share.url : null;

  const save = useCallback(async (): Promise<string | null> => {
    if (shareUrl) return shareUrl;

    const blob = await stageRef.current?.toBlob("image/jpeg");

    if (!blob) {
      toast.error("The preview could not be exported. Try again.");
      return null;
    }

    setIsSaving(true);

    try {
      const form = new FormData();
      form.append("result", blob, "visualisation.jpg");
      if (room.file) form.append("source", room.file);
      const variantId = material?.variantId ?? material?.variant?.id ?? null;
      if (variantId) form.append("product_variant_id", String(variantId));

      const settings: Record<string, string | number> = {
        width_m: placement.widthM,
        rotation: placement.rotation,
        opacity: placement.opacity,
        brightness: placement.brightness,
        lighting: placement.lighting,
        layout: placement.layout,
        plank_length_mm: placement.plankLengthMm,
        plank_width_mm: placement.plankWidthMm,
        finish: placement.finish,
      };
      if (material?.variantName) settings.finish_label = material.variantName;
      if (!room.file && room.src.startsWith("/images/")) settings.room = room.src;
      if (maskEdits.length) settings.mask_edits = JSON.stringify(maskEdits);

      Object.entries(settings).forEach(([key, value]) =>
        form.append(`settings[${key}]`, String(value)),
      );
      quad.forEach((point, index) => {
        form.append(`settings[quad][${index}][x]`, String(point.x));
        form.append(`settings[quad][${index}][y]`, String(point.y));
      });

      const response = await fetch("/api/visualizations", { method: "POST", body: form });
      const payload = (await response.json()) as {
        share_url?: string;
        share_token?: string;
        result_url?: string | null;
        message?: string;
      };

      if (!response.ok || !payload.share_url || !payload.share_token) {
        throw new Error(payload.message ?? "Save failed");
      }

      setShare({ key: designKey, url: payload.share_url, token: payload.share_token });
      library.savedDesign({
        token: payload.share_token,
        url: payload.share_url,
        imageUrl: payload.result_url ?? null,
        productName: material
          ? `${material.productName}${material.variantName ? ` — ${material.variantName}` : ""}`
          : null,
        savedAt: new Date().toISOString(),
      });
      track("design_saved", {
        product: material?.productSlug,
        layout: placement.layout,
        origin: room.origin,
      });

      return payload.share_url;
    } catch {
      toast.error("We could not save that just now. Please try again.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [designKey, maskEdits, material, placement, quad, room, shareUrl]);

  const renderImage = useCallback(
    () => stageRef.current?.toBlob("image/jpeg") ?? Promise.resolve(null),
    [],
  );

  const renderBeforeAfter = useCallback(
    () =>
      stageRef.current?.beforeAfter(
        material ? material.productName : "Your new floor",
        material?.variantName ?? (material ? LAYOUT_LABELS[placement.layout] : null),
      ) ?? Promise.resolve(null),
    [material, placement.layout],
  );

  const onStageReady = useCallback((handle: RoomStageHandle) => {
    stageRef.current = handle;
  }, []);

  const onRendered = useCallback(() => {
    if (!material || detection.state.status === "running") return;
    const key = `${room.src}|${materialKey(material)}`;
    if (completedRef.current.has(key)) return;
    completedRef.current.add(key);
    track("visualization_completed", {
      product: material.productSlug,
      origin: room.origin ?? "sample",
      detected: detection.state.status === "done",
      layout: placement.layout,
    });
  }, [detection.state.status, material, placement.layout, room.origin, room.src]);

  // --- Derived ---------------------------------------------------------------

  const stageMaterial = useMemo(() => toStageMaterial(material), [material]);
  const stageCompare = useMemo(() => toStageMaterial(compareMaterial), [compareMaterial]);

  const productUrl = material
    ? absoluteUrl(`/visualizer?product=${encodeURIComponent(material.productSlug)}`)
    : absoluteUrl("/visualizer");

  const arSpec = useMemo(
    () =>
      material
        ? arSpecFor(material, {
            layout: placement.layout === "natural" ? undefined : placement.layout,
            rotationDegrees: placement.rotation,
            finish: placement.finish,
            lengthMm: placement.plankLengthMm,
            widthMm: placement.plankWidthMm,
          })
        : null,
    [material, placement],
  );

  const designNote = `Visualised as ${LAYOUT_LABELS[placement.layout].toLowerCase()}, ${placement.plankLengthMm}×${placement.plankWidthMm}mm, ${placement.finish} finish.`;

  const isFavorite = material
    ? favorites.some((entry) => materialKey(entry) === materialKey(material))
    : false;

  return (
    <div className="container-fluid grid grid-cols-1 gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:py-10">
      {/* Stage and its tools */}
      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
        <RoomStage
          photoSrc={room.src}
          material={stageMaterial}
          compareMaterial={stageCompare}
          quad={quad}
          placement={placement}
          mask={mask}
          mode={mode}
          tool={tool}
          brush={brush}
          polygonDraft={polygonDraft}
          onPolygonDraftChange={setPolygonDraft}
          onQuadChange={setQuad}
          onMaskEdit={addMaskEdit}
          onReady={onStageReady}
          onPhotoLoaded={setPhotoSize}
          onRendered={onRendered}
          detection={detection.state}
        />

        <DetectionNotice
          state={detection.state}
          onRetry={detection.retry}
          onMarkByHand={() => selectTool("corners")}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="radiogroup" aria-label="Compare" className="flex flex-wrap gap-1.5">
            <ModeButton
              active={mode === "wipe"}
              icon={<SplitSquareHorizontal className="h-4 w-4" aria-hidden />}
              onClick={() => setMode("wipe")}
            >
              Before / after
            </ModeButton>
            <ModeButton
              active={mode === "split"}
              icon={<Columns2 className="h-4 w-4" aria-hidden />}
              onClick={() => {
                setMode("split");
                setTool("view");
                track("comparison_used", { mode: "split" });
              }}
            >
              Side by side
            </ModeButton>
            <ModeButton
              active={mode === "products"}
              icon={<Layers className="h-4 w-4" aria-hidden />}
              onClick={() => {
                setMode("products");
                setTool("view");
                setCompareSlot("b");
                setPanel("floors");
                track("comparison_used", { mode: "products" });
              }}
            >
              Compare floors
            </ModeButton>
          </div>

          <Button className="h-10" onClick={() => setIsShareOpen(true)} disabled={!material}>
            <Share2 aria-hidden />
            Save &amp; share
          </Button>
        </div>

        <FloorAreaTools
          tool={tool}
          onTool={selectTool}
          brush={brush}
          onBrush={setBrush}
          editCount={maskEdits.length}
          polygonPoints={polygonDraft.length}
          onUndo={() => setMaskEdits((current) => current.slice(0, -1))}
          onResetEdits={() => setMaskEdits([])}
          onResetCorners={() => {
            setQuad(DEFAULT_QUAD);
            setMaskEdits([]);
            detection.retry();
          }}
          onFinishPolygon={() => {
            if (polygonDraft.length >= 3)
              addMaskEdit({ type: "polygon", mode: brush.mode, points: polygonDraft });
            setPolygonDraft([]);
          }}
          onUndoPoint={() => setPolygonDraft((points) => points.slice(0, -1))}
          onCancelPolygon={() => setPolygonDraft([])}
        />
      </div>

      {/* Floors, layout and room */}
      <aside className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="floors">Floors</TabsTrigger>
            <TabsTrigger value="adjust">Adjust</TabsTrigger>
            <TabsTrigger value="room">Room</TabsTrigger>
          </TabsList>

          <TabsContent value="floors" className="mt-4">
            <MaterialBrowser
              initial={materials}
              filters={filters}
              selected={mode === "products" && compareSlot === "b" ? compareMaterial : material}
              onSelect={(choice) => chooseMaterial(choice)}
              header={
                mode === "products" ? (
                  <div className="rounded-md border border-gold/40 bg-gold/5 p-2">
                    <p className="px-1 text-xs text-muted-foreground">Choosing the floor for:</p>
                    <div
                      className="mt-1.5 grid grid-cols-2 gap-1.5"
                      role="radiogroup"
                      aria-label="Which side"
                    >
                      <Chip
                        active={compareSlot === "a"}
                        onClick={() => setCompareSlot("a")}
                        className="truncate"
                      >
                        Left · {material?.variantName ?? material?.productName ?? "—"}
                      </Chip>
                      <Chip
                        active={compareSlot === "b"}
                        onClick={() => setCompareSlot("b")}
                        className="truncate"
                      >
                        Right ·{" "}
                        {compareMaterial?.variantName ?? compareMaterial?.productName ?? "choose"}
                      </Chip>
                    </div>
                  </div>
                ) : null
              }
            />
          </TabsContent>

          <TabsContent value="adjust" className="mt-4">
            <AdjustPanel
              placement={placement}
              kind={material?.kind ?? "plank"}
              productDimensions={productDimensions}
              onChange={setPlacement}
              onLayoutChange={changeLayout}
              onReset={() => {
                setLayoutPinned(false);
                setPlacement(placementFor(material, DEFAULT_PLACEMENT, false));
              }}
            />
          </TabsContent>

          <TabsContent value="room" className="mt-4">
            <RoomPanel
              sampleRooms={sampleRooms}
              current={room.src}
              onUpload={() => uploadRef.current?.click()}
              onCamera={() => cameraRef.current?.click()}
              onSample={(sample) => {
                keepQuadRef.current = false;
                changeRoom({ ...sample, origin: "sample" });
              }}
            />
          </TabsContent>
        </Tabs>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyUpload(file, "upload");
            event.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyUpload(file, "camera");
            event.target.value = "";
          }}
        />
      </aside>

      {/* The product and what to do next */}
      <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
        {material && (
          <MaterialDetails
            material={material}
            isFavorite={isFavorite}
            onToggleFavorite={() => toggleFavorite(material)}
            areaSqm={areaSqm}
            onAreaChange={setAreaSqm}
            onRequestQuote={() => setLead("quote")}
            onOrderSample={() => setLead("sample")}
            pageUrl={productUrl}
            ar={
              <ArLauncher
                spec={arSpec}
                productName={material.productName}
                phoneUrl={productUrl}
                className="w-full"
              />
            }
          />
        )}

        <p className="max-w-2xl text-xs text-muted-foreground">
          This preview is a decision-support tool, not an exact match. Lighting, camera and screen
          differences mean the installed floor will look different — always confirm with a physical
          sample before ordering.
        </p>
      </div>

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        shareUrl={shareUrl}
        isSaving={isSaving}
        onSave={save}
        title={material ? material.productName : "this floor"}
        renderImage={renderImage}
        renderBeforeAfter={renderBeforeAfter}
      />

      <LeadDialog
        kind={lead ?? "quote"}
        open={lead !== null}
        onOpenChange={(open) => !open && setLead(null)}
        material={material}
        areaSqm={areaSqm}
        render={renderImage}
        shareUrl={shareUrl}
        designNote={designNote}
      />
    </div>
  );
}

/**
 * The tools for correcting where the floor is: perspective corners, a brush,
 * and a shape drawn point by point. Kept one tap away at all times, because a
 * wrong-but-confident detection is worse than none.
 */
function FloorAreaTools({
  tool,
  onTool,
  brush,
  onBrush,
  editCount,
  polygonPoints,
  onUndo,
  onResetEdits,
  onResetCorners,
  onFinishPolygon,
  onUndoPoint,
  onCancelPolygon,
}: {
  tool: StageTool;
  onTool: (tool: StageTool) => void;
  brush: { mode: MaskMode; size: number };
  onBrush: (brush: { mode: MaskMode; size: number }) => void;
  editCount: number;
  polygonPoints: number;
  onUndo: () => void;
  onResetEdits: () => void;
  onResetCorners: () => void;
  onFinishPolygon: () => void;
  onUndoPoint: () => void;
  onCancelPolygon: () => void;
}) {
  const isPainting = tool === "brush" || tool === "polygon";

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Floor area
        </span>
        <ToolButton
          active={tool === "corners"}
          onClick={() => onTool("corners")}
          icon={<Move className="h-4 w-4" aria-hidden />}
        >
          Perspective
        </ToolButton>
        <ToolButton
          active={tool === "brush"}
          onClick={() => onTool("brush")}
          icon={<Brush className="h-4 w-4" aria-hidden />}
        >
          Paint
        </ToolButton>
        <ToolButton
          active={tool === "polygon"}
          onClick={() => onTool("polygon")}
          icon={<PenTool className="h-4 w-4" aria-hidden />}
        >
          Draw area
        </ToolButton>
        {editCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8" onClick={onUndo}>
            <Undo2 aria-hidden />
            Undo
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={onResetCorners}>
          <RotateCcw aria-hidden />
          Re-detect
        </Button>
      </div>

      {tool === "corners" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Drag the four corners onto the floor so its edges run the way the room does — along the
          skirting and towards the far wall. This sets the perspective; the floor itself is detected
          separately.
        </p>
      )}

      {isPainting && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <div role="radiogroup" aria-label="Brush mode" className="flex gap-1.5">
            <Chip active={brush.mode === "add"} onClick={() => onBrush({ ...brush, mode: "add" })}>
              <Plus className="mr-1 inline h-3 w-3" aria-hidden />
              Add floor
            </Chip>
            <Chip
              active={brush.mode === "erase"}
              onClick={() => onBrush({ ...brush, mode: "erase" })}
            >
              <Eraser className="mr-1 inline h-3 w-3" aria-hidden />
              Remove
            </Chip>
          </div>

          {tool === "brush" ? (
            <div className="min-w-[10rem] flex-1">
              <Slider
                id="brush-size"
                label="Brush size"
                hint={`${Math.round(brush.size * 100)}%`}
                min={1}
                max={20}
                step={1}
                value={Math.round(brush.size * 100)}
                onChange={(value) => onBrush({ ...brush, size: value / 100 })}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {polygonPoints === 0
                  ? "Tap around the area, point by point."
                  : `${polygonPoints} points`}
              </span>
              <Button
                size="sm"
                className="h-8"
                disabled={polygonPoints < 3}
                onClick={onFinishPolygon}
              >
                <Check aria-hidden />
                Fill area
              </Button>
              {polygonPoints > 0 && (
                <>
                  <Button variant="ghost" size="sm" className="h-8" onClick={onUndoPoint}>
                    <Undo2 aria-hidden />
                    Point
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={onCancelPolygon}>
                    <X aria-hidden />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}

          {editCount > 0 && (
            <button
              type="button"
              onClick={onResetEdits}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear my edits
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8"
            onClick={() => onTool("view")}
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

function RoomPanel({
  sampleRooms,
  current,
  onUpload,
  onCamera,
  onSample,
}: {
  sampleRooms: SampleRoom[];
  current: string;
  onUpload: () => void;
  onCamera: () => void;
  onSample: (sample: SampleRoom) => void;
}) {
  const { designs } = useLibrary();

  return (
    <div className="space-y-6">
      <section>
        <Button className="h-11 w-full" onClick={onUpload}>
          <Upload aria-hidden />
          Upload a photo of your room
        </Button>
        {/* Only offered where there is a camera to open. */}
        <Button
          variant="outline"
          className="mt-2 hidden h-11 w-full [@media(pointer:coarse)]:inline-flex"
          onClick={onCamera}
        >
          <Camera aria-hidden />
          Take a photo now
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Stand in a doorway or corner, hold the phone level at chest height, and get as much floor
          in shot as you can. Your photo stays on this device unless you save or send it.
        </p>
      </section>

      {sampleRooms.length > 0 && (
        <section>
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Or use one of our rooms
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {sampleRooms.map((sample) => (
              <button
                key={sample.src}
                type="button"
                onClick={() => onSample(sample)}
                aria-pressed={current === sample.src}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-md bg-muted bg-cover bg-center text-left transition",
                  current === sample.src
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
                    : "opacity-85 hover:opacity-100",
                )}
                style={{ backgroundImage: `url(${sample.src})` }}
              >
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white">
                  {sample.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {designs.length > 0 && (
        <section>
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your saved designs
          </h3>
          <ul className="mt-2 space-y-2">
            {designs.slice(0, 6).map((design) => (
              <li key={design.token} className="flex items-center gap-3">
                <Link
                  href={`/visualizer?design=${design.token}`}
                  scroll={false}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 transition hover:bg-surface"
                >
                  <span
                    className="h-12 w-16 shrink-0 rounded bg-muted bg-cover bg-center"
                    style={
                      design.imageUrl ? { backgroundImage: `url(${design.imageUrl})` } : undefined
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {design.productName ?? "Room design"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {new Date(design.savedAt).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => library.forgetDesign(design.token)}
                  aria-label="Remove from this list"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kept in this browser.{" "}
            <Link href="/account/saved" className="underline underline-offset-2">
              Sign in
            </Link>{" "}
            to keep designs with your account.
          </p>
        </section>
      )}
    </div>
  );
}

/**
 * What automatic detection is doing, and what to do when it cannot help.
 *
 * Detection is a refinement, never a gate: the room and material are already
 * rendered against a default floor area while this runs, and the tools stay
 * available throughout.
 */
function DetectionNotice({
  state,
  onRetry,
  onMarkByHand,
}: {
  state: DetectionState;
  onRetry: () => void;
  onMarkByHand: () => void;
}) {
  if (state.status === "unavailable") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
        <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
        We could not pick out the floor in this photo.
        <button
          type="button"
          onClick={onMarkByHand}
          className="font-semibold text-foreground underline underline-offset-2"
        >
          Mark it by hand
        </button>
        or
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 hover:text-foreground"
        >
          try again
        </button>
      </p>
    );
  }

  // While detection runs, its progress is shown over the stage itself.
  return null;
}

function ModeButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        active
          ? "border-charcoal bg-charcoal font-semibold text-primary-foreground"
          : "border-border hover:border-foreground/40",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        active
          ? "border-gold bg-gold/15 text-foreground"
          : "border-border hover:border-foreground/40",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// --- Helpers -----------------------------------------------------------------

function toStageMaterial(choice: TextureChoice | null): StageMaterial | null {
  if (!choice) return null;

  return {
    textureSrc: choice.textureUrl,
    kind: choice.kind ?? "plank",
    isSeamless: choice.isSeamless ?? false,
    textureSizeM: choice.textureSizeM ?? null,
    label: choice.variantName
      ? `${choice.productName} — ${choice.variantName}`
      : choice.productName,
  };
}

/** The product's own piece size, longest side first, or a typical one. */
function dimensionsOf(choice: TextureChoice | null): {
  lengthMm: number;
  widthMm: number;
  isMeasured: boolean;
} {
  const kind = choice?.kind ?? "plank";
  const length = choice?.variant?.dimensions.length_mm ?? null;
  const width = choice?.variant?.dimensions.width_mm ?? null;

  if (length && width && length > 0 && width > 0) {
    return {
      lengthMm: Math.max(length, width),
      widthMm: Math.min(length, width),
      isMeasured: true,
    };
  }

  return { ...defaultDimensions(kind), isMeasured: false };
}

/**
 * Placement for a newly chosen material: its own piece size, and a layout it
 * can actually be laid in. A layout the visitor picked is kept wherever the new
 * floor allows it; otherwise a dedicated texture is laid in its natural
 * pattern and a product photograph is shown as photographed.
 */
function placementFor(
  choice: TextureChoice | null,
  current: Placement,
  layoutPinned: boolean,
): Placement {
  const kind = choice?.kind ?? "plank";
  const dimensions = dimensionsOf(choice);
  const layouts = layoutsFor(kind);
  const fallbackLayout: LayoutPattern = choice?.isSeamless
    ? kind === "tile"
      ? "grid"
      : kind === "plank"
        ? "staggered"
        : "natural"
    : "natural";

  return {
    ...current,
    layout: layoutPinned && layouts.includes(current.layout) ? current.layout : fallbackLayout,
    plankLengthMm: dimensions.lengthMm,
    plankWidthMm: dimensions.widthMm,
    finish: kind === "carpet" || kind === "rug" ? "matte" : current.finish,
  };
}

function restorePlacement(settings: Record<string, unknown>, base: Placement): Placement {
  const numberOr = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const layouts: LayoutPattern[] = [
    "natural",
    "straight",
    "staggered",
    "herringbone",
    "diagonal",
    "grid",
  ];
  const finishes = ["matte", "satin", "gloss"] as const;

  return {
    ...base,
    widthM: numberOr(settings.width_m, base.widthM, 1, 20),
    rotation: numberOr(settings.rotation, base.rotation, -180, 180),
    lighting: numberOr(settings.lighting, base.lighting, 0, 1),
    brightness: numberOr(settings.brightness, base.brightness, 0.5, 1.5),
    opacity: numberOr(settings.opacity, base.opacity, 0, 1),
    plankLengthMm: numberOr(settings.plank_length_mm, base.plankLengthMm, 50, 6000),
    plankWidthMm: numberOr(settings.plank_width_mm, base.plankWidthMm, 50, 6000),
    layout: layouts.includes(settings.layout as LayoutPattern)
      ? (settings.layout as LayoutPattern)
      : base.layout,
    finish: finishes.includes(settings.finish as (typeof finishes)[number])
      ? (settings.finish as (typeof finishes)[number])
      : base.finish,
  };
}

function parseQuad(value: unknown): Quad | null {
  if (!Array.isArray(value) || value.length !== 4) return null;

  const points = value.map((point) => ({
    x: Number((point as { x?: unknown })?.x),
    y: Number((point as { y?: unknown })?.y),
  }));

  return points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    ? (points as Quad)
    : null;
}
