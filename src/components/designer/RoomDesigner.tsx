"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Camera, Grid2x2, Loader2, MessageCircle, Ruler, Scan } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaterialPicker } from "@/components/visualizer/MaterialPicker";
import { naira, number, whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { DEFAULT_PLAN, floorArea, perimeter, type RoomPlan } from "@/lib/room/plan";
import { estimateMaterial, plankSize } from "@/lib/room/material";
import { checkArSupport, type ArSupport } from "@/lib/room/ar-session";
import type { Variant } from "@/lib/api/types";
import type { TextureChoice } from "@/lib/visualizer/types";
import { PlanEditor } from "./PlanEditor";
import type { CameraMode } from "./RoomScene";

/**
 * Three.js is a large dependency and only the 3D view needs it, so it is split
 * out and loaded when that view is first opened.
 */
const RoomScene = dynamic(() => import("./RoomScene").then((module) => module.RoomScene), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-[4/3] place-items-center bg-surface">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Building your room…
      </p>
    </div>
  ),
});

type View = "plan" | "room";

/** Waste allowance when the product does not specify one (§12). */
const DEFAULT_WASTE = 10;

/**
 * The room designer (§11).
 *
 * A customer describes the room they have, sees it built in three dimensions
 * with the material they are considering laid at its true size, and — on a
 * phone that supports it — holds that material against their own floor. The
 * area, packs and cost update as they go, from the same arithmetic the
 * calculator and the quote use.
 */
export function RoomDesigner({ materials }: { materials: TextureChoice[] }) {
  const [plan, setPlan] = useState<RoomPlan>(DEFAULT_PLAN);
  const [material, setMaterial] = useState<TextureChoice | null>(materials[0] ?? null);
  const [view, setView] = useState<View>("plan");
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [rotation, setRotation] = useState(0);
  const [arSupport, setArSupport] = useState<ArSupport>("checking");
  const [isArRunning, setIsArRunning] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<{ end: () => void } | null>(null);

  const variant = material?.variant ?? null;
  const areaSqm = floorArea(plan);
  const estimate = estimateMaterial({
    areaSqm,
    wastePercentage: material?.wastePercentage ?? DEFAULT_WASTE,
    variant,
  });
  const plank = plankSize(variant);

  useEffect(() => {
    void checkArSupport().then(setArSupport);
  }, []);

  // Leaving the page mid-session would otherwise strand the camera.
  useEffect(() => () => arRef.current?.end(), []);

  const startAr = useCallback(async () => {
    if (!material) return;

    try {
      const { startArSession } = await import("@/lib/room/ar-session");

      arRef.current = await startArSession({
        textureUrl: material.textureUrl,
        variant,
        rotationDegrees: rotation,
        overlay: overlayRef.current,
        onEnd: () => setIsArRunning(false),
      });

      setIsArRunning(true);
    } catch {
      toast.error("Your device would not start an AR session. Try the 3D room instead.");
    }
  }, [material, rotation, variant]);

  return (
    <div className="container-fluid grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ViewTab
            active={view === "plan"}
            onClick={() => setView("plan")}
            icon={<Grid2x2 className="h-4 w-4" aria-hidden />}
          >
            Plan
          </ViewTab>
          <ViewTab
            active={view === "room"}
            onClick={() => setView("room")}
            icon={<Box className="h-4 w-4" aria-hidden />}
          >
            3D room
          </ViewTab>

          {view === "room" && (
            <div className="ml-auto flex gap-2">
              <ViewTab
                active={cameraMode === "overview"}
                onClick={() => setCameraMode("overview")}
                icon={<Scan className="h-4 w-4" aria-hidden />}
              >
                Overview
              </ViewTab>
              <ViewTab
                active={cameraMode === "standing"}
                onClick={() => setCameraMode("standing")}
                icon={<Ruler className="h-4 w-4" aria-hidden />}
              >
                Eye level
              </ViewTab>
            </div>
          )}
        </div>

        {view === "plan" ? (
          <PlanEditor plan={plan} onChange={setPlan} areaSqm={areaSqm} />
        ) : (
          <div className="aspect-[4/3] overflow-hidden border border-border bg-surface">
            <RoomScene
              plan={plan}
              textureUrl={material?.textureUrl ?? null}
              variant={variant}
              rotationDegrees={rotation}
              cameraMode={cameraMode}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[9rem]">
            <label htmlFor="lay-direction" className="text-sm">
              Lay direction{" "}
              <span className="font-mono text-xs text-muted-foreground">{rotation}°</span>
            </label>
            <input
              id="lay-direction"
              type="range"
              min={0}
              max={90}
              step={15}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
              className="mt-1 h-1 w-full appearance-none bg-border accent-gold"
            />
          </div>

          <ArButton
            support={arSupport}
            isRunning={isArRunning}
            hasMaterial={material !== null}
            onStart={startAr}
            onStop={() => arRef.current?.end()}
          />
        </div>

        {plank.isMeasured ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Planks are drawn at their real size — {number(plank.lengthM * 1000, 0)} ×{" "}
            {number(plank.widthM * 1000, 0)}mm — so the board count you see is the board count you
            get.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            This product has no plank dimensions recorded, so a standard 1220 × 183mm board is
            assumed. Colour and finish are indicative.
          </p>
        )}
      </div>

      <aside className="space-y-8">
        <section>
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Choose a floor
          </h2>
          <div className="mt-3">
            <MaterialPicker choices={materials} selected={material} onSelect={setMaterial} />
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            This room
          </h2>

          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Floor area">{number(estimate.areaSqm)} m²</Row>
            <Row label={`With ${number(estimate.wastePercentage)}% waste`}>
              {number(estimate.areaWithWasteSqm)} m²
            </Row>
            <Row label="Skirting">{number(perimeter(plan))} m</Row>
            {estimate.packs !== null && <Row label="Packs needed">{estimate.packs}</Row>}
            {estimate.cost !== null && (
              <Row label="Estimated material">
                <span className="font-mono text-base">{naira(estimate.cost)}</span>
              </Row>
            )}
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            An estimate for planning, not a final measurement. Installation, underlay and delivery
            are quoted separately.
          </p>
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
                <Link href={`/visualizer?product=${material.productSlug}`}>
                  <Camera className="h-4 w-4" aria-hidden />
                  Try it in a photo of your room
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
                Send this room to a consultant
              </a>
            </div>
          </section>
        )}
      </aside>

      {/* Shown over the camera feed during an AR session. */}
      <div
        ref={overlayRef}
        className={isArRunning ? "fixed inset-x-0 bottom-0 z-50 p-6" : "hidden"}
      >
        {isArRunning && (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="bg-charcoal-dark/80 px-4 py-2 text-sm text-primary-foreground">
              Point at your floor, then tap to place the material.
            </p>
            <Button className="h-11 rounded-none" onClick={() => arRef.current?.end()}>
              Exit AR
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ArButton({
  support,
  isRunning,
  hasMaterial,
  onStart,
  onStop,
}: {
  support: ArSupport;
  isRunning: boolean;
  hasMaterial: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  if (support === "checking") return null;

  if (support !== "supported") {
    return (
      <p className="text-xs text-muted-foreground">
        {support === "insecure"
          ? "AR needs a secure (https) connection."
          : "AR is not available on this device — iPhones and iPads do not yet support it in the browser. The 3D room works everywhere."}
      </p>
    );
  }

  return (
    <Button
      variant={isRunning ? "default" : "outline"}
      className="ml-auto h-11 rounded-none"
      disabled={!hasMaterial}
      onClick={isRunning ? onStop : onStart}
    >
      <Camera className="h-4 w-4" aria-hidden />
      {isRunning ? "Exit AR" : "View in your room (AR)"}
    </Button>
  );
}

function ViewTab({
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
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex h-10 items-center gap-2 border border-charcoal-dark bg-charcoal-dark px-4 text-sm font-semibold text-primary-foreground"
          : "inline-flex h-10 items-center gap-2 border border-border px-4 text-sm transition hover:border-gold hover:text-gold"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
