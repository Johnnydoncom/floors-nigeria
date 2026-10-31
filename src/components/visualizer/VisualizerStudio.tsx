"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  Camera,
  Check,
  ChevronDown,
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
  Wand2,
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
import type { DetectionQuality } from "@/lib/visualizer/detect-floor";
import type { SmartSelectProgress } from "@/lib/visualizer/smart-select";
import { prepareRoomPhoto } from "@/lib/visualizer/images";
import { library, materialKey, useLibrary } from "@/lib/visualizer/library";
import {
  composeMask,
  parseMaskEdits,
  type MaskEdit,
  type MaskMode,
} from "@/lib/visualizer/mask-edits";
import { floorWidthFromCamera, unitSquareToQuad } from "@/lib/visualizer/homography";
import { defaultDimensions, LAYOUT_LABELS, layoutsFor } from "@/lib/visualizer/patterns";
import {
  DEFAULT_PLACEMENT,
  DEFAULT_QUAD,
  FLOOR_WIDTH_RANGE,
  type FloorPreset,
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

export type SampleRoom = { src: string; label: string; floor?: FloorPreset };

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
    floor: sampleRooms[0]?.floor,
    origin: "sample",
  }));
  const [material, setMaterial] = useState<TextureChoice | null>(() => starterMaterial(materials));
  const [compareMaterial, setCompareMaterial] = useState<TextureChoice | null>(null);
  const [placement, setPlacement] = useState<Placement>(() =>
    placementFor(starterMaterial(materials), DEFAULT_PLACEMENT, false),
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
  const [smart, setSmart] = useState<SmartState>({ status: "idle" });
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

  /** The corners the fast pass placed, to tell whether anyone has moved them since. */
  const detectedQuadRef = useRef<Quad | null>(null);
  /** Set once the visitor, or a saved design, has said how wide the floor is. */
  const widthPinnedRef = useRef(false);
  const suggestedWidthRef = useRef(DEFAULT_PLACEMENT.widthM);

  const onDetected = useCallback(
    (detectedQuad: Quad, mask: CanvasImageSource, pass: DetectionQuality) => {
      const suggested = suggestedFloorWidth(detectedQuad, mask as HTMLCanvasElement);

      if (suggested && !keepQuadRef.current && !widthPinnedRef.current) {
        suggestedWidthRef.current = suggested;
        setPlacement((current) => ({ ...current, widthM: suggested }));
      }

      if (pass === "fast") {
        detectedQuadRef.current = keepQuadRef.current ? null : detectedQuad;
        if (!keepQuadRef.current) setQuad(detectedQuad);
        keepQuadRef.current = false;
      } else {
        // The sharper pass moves the corners only if nobody else has: a corner
        // the visitor dragged stays where they put it. Their brush and polygon
        // edits are replayed over the new mask either way.
        setQuad((current) => (current === detectedQuadRef.current ? detectedQuad : current));
      }

      setDetectedMask(mask as HTMLCanvasElement);
    },
    [],
  );

  const detection = useFloorDetection({ photoSrc: room.src, preset: room.floor, onDetected });

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
    setSmart({ status: "idle" });
    // The same photograph is not detected again, so it keeps the floor it has.
    if (next.src !== room.src) {
      setQuad(DEFAULT_QUAD);
      detectedQuadRef.current = null;
      setDetectedMask(null);
      setPhotoSize(null);
    }
    setMaskEdits([]);
    setPolygonDraft([]);
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

  /** The floor last seen on the stage, to go back to when a new one will not load. */
  const shownMaterialRef = useRef<TextureChoice | null>(null);
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(new Set());
  const unavailableRef = useRef(new Set<string>());

  const onTextureFailed = useCallback(
    (src: string) => {
      unavailableRef.current.add(src);
      setUnavailable(new Set(unavailableRef.current));
      setCompareMaterial((current) => (current?.textureUrl === src ? null : current));

      const shown = shownMaterialRef.current;
      const fallback =
        shown && shown.textureUrl !== src
          ? shown
          : starterMaterial(
              materials.filter((choice) => !unavailableRef.current.has(choice.textureUrl)),
            );

      setMaterial((current) => (current?.textureUrl === src ? fallback : current));
      setPlacement((current) => placementFor(fallback, current, false));

      if (shown) toast.error("That floor's image could not be loaded. Please try another.");
    },
    [materials],
  );

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

      keepQuadRef.current = savedQuad !== null && src !== room.src;

      changeRoom({
        src,
        label: "Saved design",
        origin: "design",
        floor: sampleRooms.find((sample) => sample.src === src)?.floor,
      });
      if (savedQuad) setQuad(savedQuad);
      setMaskEdits(parseMaskEdits(settings.mask_edits));

      if (choice) {
        setMaterial(choice);
        library.viewed(choice);
      }

      widthPinnedRef.current = typeof settings.width_m !== "undefined";
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
    // Download the model and read the photo now, so the first tap is quick.
    if (next === "smart" && tool !== "smart") void readyForSmartSelect();
  };

  /** The room smart select is working on, so a late result for another is dropped. */
  const smartRoomRef = useRef(room.src);
  useEffect(() => {
    smartRoomRef.current = room.src;
  }, [room.src]);

  const onSmartProgress = (src: string) => (progress: SmartSelectProgress) => {
    if (smartRoomRef.current !== src) return;
    setSmart((current) =>
      current.status === "selecting" ? current : { status: "preparing", progress },
    );
  };

  const readyForSmartSelect = async () => {
    const src = room.src;
    if (smart.status === "ready" || smart.status === "preparing") return;

    try {
      const { isSmartSelectAvailable, prepareSmartSelect } =
        await import("@/lib/visualizer/smart-selector");
      if (!isSmartSelectAvailable()) {
        setSmart({ status: "unavailable" });
        return;
      }
      setSmart({ status: "preparing" });
      await prepareSmartSelect(src, onSmartProgress(src));
      if (smartRoomRef.current === src) {
        setSmart((current) => (current.status === "selecting" ? current : { status: "ready" }));
      }
    } catch {
      if (smartRoomRef.current === src) setSmart({ status: "unavailable" });
    }
  };

  const onSmartTap = async (point: Point) => {
    const src = room.src;
    if (smart.status === "selecting") return;

    setSmart({ status: "selecting", at: point });

    try {
      const { smartSelect } = await import("@/lib/visualizer/smart-selector");
      const area = await smartSelect(src, point, onSmartProgress(src));
      if (smartRoomRef.current !== src) return;

      if (area) addMaskEdit({ type: "area", mode: brush.mode, ...area });
      else toast("Nothing to select there — try a spot nearer the middle of the area.");
      setSmart({ status: "ready" });
    } catch {
      if (smartRoomRef.current === src) setSmart({ status: "unavailable" });
    }
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
    shownMaterialRef.current = material;
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
    <div className="container-fluid grid grid-cols-1 gap-3 pb-8 pt-2 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 lg:gap-x-8 lg:pb-10 lg:pt-4">
      {/* The room. On a phone it stays in view while floors are chosen below it. */}
      <div className="z-20 min-w-0 space-y-2 bg-background pb-2 max-lg:sticky max-lg:top-[calc(var(--header-height)-0.25rem)] max-lg:pt-1 lg:col-start-1 lg:row-start-1 lg:pb-0">
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
          onSmartTap={onSmartTap}
          smartBusyAt={smart.status === "selecting" ? smart.at : null}
          onReady={onStageReady}
          onPhotoLoaded={setPhotoSize}
          onRendered={onRendered}
          onTextureFailed={onTextureFailed}
          detection={detection.state}
        />

        <DetectionNotice
          state={detection.state}
          onRetry={detection.retry}
          onMarkByHand={() => selectTool("corners")}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:col-start-1 lg:row-start-2">
        <div role="radiogroup" aria-label="Compare" className="flex gap-1.5">
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
            <span>
              Compare<span className="hidden sm:inline"> floors</span>
            </span>
          </ModeButton>
        </div>

        <div className="flex gap-1.5 max-sm:w-full">
          <Button
            variant="outline"
            className="h-9 max-sm:flex-1 sm:h-10"
            onClick={() => uploadRef.current?.click()}
          >
            <Upload aria-hidden />
            Use your room
          </Button>
          <Button
            className="h-9 max-sm:flex-1 sm:h-10"
            onClick={() => setIsShareOpen(true)}
            disabled={!material}
          >
            <Share2 aria-hidden />
            Save &amp; share
          </Button>
        </div>
      </div>

      <div className="order-last min-w-0 lg:order-none lg:col-start-1 lg:row-start-3">
        <FloorAreaTools
          tool={tool}
          onTool={selectTool}
          brush={brush}
          onBrush={setBrush}
          editCount={maskEdits.length}
          polygonPoints={polygonDraft.length}
          smart={smart}
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
      <aside className="min-w-0 lg:sticky lg:top-[var(--header-height)] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:max-h-[calc(100dvh-var(--header-height)-1rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="floors">Floors</TabsTrigger>
            <TabsTrigger value="adjust">Adjust</TabsTrigger>
            <TabsTrigger value="room">Room</TabsTrigger>
          </TabsList>

          <TabsContent value="floors" className="mt-3">
            <MaterialBrowser
              initial={materials}
              filters={filters}
              selected={mode === "products" && compareSlot === "b" ? compareMaterial : material}
              unavailable={unavailable}
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
              onChange={(next) => {
                if (next.widthM !== placement.widthM) widthPinnedRef.current = true;
                setPlacement(next);
              }}
              onLayoutChange={changeLayout}
              onReset={() => {
                setLayoutPinned(false);
                widthPinnedRef.current = false;
                setPlacement(
                  placementFor(
                    material,
                    { ...DEFAULT_PLACEMENT, widthM: suggestedWidthRef.current },
                    false,
                  ),
                );
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
                if (sample.src === room.src) return;
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
      <div className="order-last min-w-0 space-y-4 lg:order-none lg:col-start-1 lg:row-start-4">
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
  smart,
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
  smart: SmartState;
  onUndo: () => void;
  onResetEdits: () => void;
  onResetCorners: () => void;
  onFinishPolygon: () => void;
  onUndoPoint: () => void;
  onCancelPolygon: () => void;
}) {
  const isPainting = tool === "brush" || tool === "polygon" || tool === "smart";
  const [isOpen, setIsOpen] = useState(false);
  const showTools = isOpen || tool !== "view";

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-expanded={showTools}
          onClick={() => {
            setIsOpen(!showTools);
            if (showTools) onTool("view");
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Fix the floor area
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showTools && "rotate-180")}
            aria-hidden
          />
        </button>
        {editCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8" onClick={onUndo}>
            <Undo2 aria-hidden />
            Undo
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={onResetCorners}>
          <RotateCcw aria-hidden />
          Reset floor
        </Button>
      </div>

      {showTools && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ToolButton
            active={tool === "corners"}
            onClick={() => onTool("corners")}
            icon={<Move className="h-4 w-4" aria-hidden />}
          >
            Perspective
          </ToolButton>
          <ToolButton
            active={tool === "smart"}
            onClick={() => onTool("smart")}
            icon={<Wand2 className="h-4 w-4" aria-hidden />}
          >
            Smart select
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
        </div>
      )}

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

          {tool === "smart" ? (
            <p className="min-w-[12rem] flex-1 text-xs text-muted-foreground" aria-live="polite">
              {smartHint(smart)}
            </p>
          ) : tool === "brush" ? (
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

type SmartState =
  | { status: "idle" | "ready" | "unavailable" }
  | { status: "preparing"; progress?: SmartSelectProgress }
  | { status: "selecting"; at: Point };

/** What smart select is doing, in a line under the tools. */
function smartHint(smart: SmartState): string {
  switch (smart.status) {
    case "preparing":
      return smart.progress?.stage === "downloading"
        ? `Getting smart select ready · ${smart.progress.percent ?? 0}% — a one-time download`
        : "Reading your photo…";
    case "selecting":
      return "Selecting…";
    case "unavailable":
      return "Smart select is not available on this device — Paint or Draw area do the same by hand.";
    default:
      return "Tap a patch the floor missed, or something it covered — smart select finds its edges.";
  }
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
        "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-10 sm:gap-2 sm:px-3 sm:text-sm",
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

/**
 * The floor the studio opens on. The first impression should be the best one
 * the catalogue can give: a real texture if there is one, or else a plank floor,
 * whose photographs make the most convincing surface.
 */
function starterMaterial(materials: TextureChoice[]): TextureChoice | null {
  return (
    materials.find((choice) => choice.isSeamless) ??
    materials.find((choice) => choice.kind === "plank") ??
    materials[0] ??
    null
  );
}

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

/** The real width of a detected quad, to the nearest 10cm the slider can show. */
function suggestedFloorWidth(quad: Quad, mask: HTMLCanvasElement): number | null {
  const { width, height } = mask;
  const corners = quad.map((point) => ({ x: point.x * width, y: point.y * height })) as Quad;
  const metres = floorWidthFromCamera(unitSquareToQuad(corners), width, height);

  if (metres === null) return null;

  const { min, max } = FLOOR_WIDTH_RANGE;

  return Math.round(Math.min(max, Math.max(min, metres)) * 10) / 10;
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
 * floor allows it; otherwise it is laid the way that floor is fitted: planks
 * staggered, tiles in a grid. Both cut the surface into real pieces, which is
 * what makes it read as a floor rather than a photograph repeated.
 */
function placementFor(
  choice: TextureChoice | null,
  current: Placement,
  layoutPinned: boolean,
): Placement {
  const kind = choice?.kind ?? "plank";
  const dimensions = dimensionsOf(choice);
  const layouts = layoutsFor(kind);
  const fallbackLayout: LayoutPattern =
    kind === "tile" ? "grid" : kind === "plank" ? "staggered" : "natural";

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
    widthM: numberOr(settings.width_m, base.widthM, 1, FLOOR_WIDTH_RANGE.max),
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
