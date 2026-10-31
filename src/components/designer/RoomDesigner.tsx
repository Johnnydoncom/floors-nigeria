"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Box, Camera, Grid2x2, Loader2, MessageCircle, Ruler, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArLauncher } from "@/components/visualizer/ArLauncher";
import { MaterialPicker } from "@/components/visualizer/MaterialPicker";
import { naira, number, whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { DEFAULT_PLAN, floorArea, perimeter, type RoomPlan } from "@/lib/room/plan";
import { estimateMaterial } from "@/lib/room/material";
import { arSpecFor } from "@/lib/room/ar-material";
import { absoluteUrl } from "@/lib/structured-data";
import type { LayoutPattern, TextureChoice } from "@/lib/visualizer/types";
import { PlanEditor, RoomDimensions } from "./PlanEditor";
import type { CameraMode } from "./RoomScene";

/**
 * Three.js is a large dependency and only the 3D view needs it, so it is split
 * out and loaded when that view is first opened.
 */
const RoomScene = dynamic(() => import("./RoomScene").then((module) => module.RoomScene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-surface">
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
  const [material, setMaterial] = useState<TextureChoice | null>(() => openingMaterial(materials));
  // The 3D room is what the page promises, so it is what opens.
  const [view, setView] = useState<View>("room");
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [rotation, setRotation] = useState(0);

  const variant = material?.variant ?? null;
  const areaSqm = floorArea(plan);
  const estimate = estimateMaterial({
    areaSqm,
    wastePercentage: material?.wastePercentage ?? DEFAULT_WASTE,
    variant,
  });

  // One description of the floor for the 3D room and AR alike, laid the way
  // the visitor has turned it. Planks are cut at their real size only from a
  // dedicated seamless texture: cut from a product photograph they repeat its
  // props — a lens cap, a pallet edge — across the whole room, so a photograph
  // is shown as photographed, as the photo visualizer does.
  const arSpec = useMemo(
    () =>
      material
        ? arSpecFor(material, {
            rotationDegrees: rotation,
            layout: layoutFor(material),
          })
        : null,
    [material, rotation],
  );

  const isMeasured = Boolean(variant?.dimensions.length_mm && variant?.dimensions.width_mm);
  const pieceName = arSpec?.kind === "tile" ? "tile" : "board";
  const size = arSpec
    ? `${number(arSpec.lengthM * 1000, 0)} × ${number(arSpec.widthM * 1000, 0)}mm`
    : "";

  return (
    <div className="container-fluid grid gap-x-8 gap-y-4 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_340px] lg:pt-4">
      {/* The room. On a phone it stays in view while everything below it changes. */}
      <div className="z-20 min-w-0 bg-background pb-2 max-lg:sticky max-lg:top-[calc(var(--header-height)-0.25rem)] max-lg:pt-1 lg:col-start-1 lg:row-start-1 lg:pb-0">
        <div className="mb-2 flex items-center gap-1.5">
          <ViewTab
            active={view === "room"}
            onClick={() => setView("room")}
            icon={<Box className="h-4 w-4" aria-hidden />}
          >
            3D room
          </ViewTab>
          <ViewTab
            active={view === "plan"}
            onClick={() => setView("plan")}
            icon={<Grid2x2 className="h-4 w-4" aria-hidden />}
          >
            Plan
          </ViewTab>

          {view === "room" && (
            <div className="ml-auto flex gap-1.5">
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
          <PlanEditor plan={plan} areaSqm={areaSqm} />
        ) : (
          <div className="aspect-[4/3] w-full overflow-hidden border border-border bg-surface max-lg:max-h-[46dvh] lg:max-h-[calc(max(100dvh-var(--header-height)-10rem,24rem))]">
            <RoomScene plan={plan} spec={arSpec} cameraMode={cameraMode} />
          </div>
        )}
      </div>

      <div className="min-w-0 max-lg:order-2 lg:col-start-1 lg:row-start-2">
        {view === "room" && (
          <p className="text-xs text-muted-foreground">
            {cameraMode === "overview"
              ? "Drag to turn the room, scroll or pinch to zoom."
              : "Drag to look around the room."}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
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

          <ArLauncher
            spec={arSpec}
            productName={material?.productName ?? "this floor"}
            phoneUrl={absoluteUrl("/room-designer")}
            designerHref="/room-designer"
            className="ml-auto"
          />
        </div>

        <section className="mt-6">
          <h2 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your room
          </h2>
          <RoomDimensions plan={plan} onChange={setPlan} />
        </section>

        {arSpec && (
          <p className="mt-4 text-xs text-muted-foreground">
            {arSpec.layout === "natural"
              ? "Shown from the product photograph, so the pattern and colour are a guide. "
              : `Each ${pieceName} is drawn at its real size, ${size}. `}
            {isMeasured
              ? "Area, packs and cost use the product's own pack coverage."
              : `No size is recorded for this product, so a standard ${size} ${pieceName} is assumed.`}
          </p>
        )}
      </div>

      {/* On a phone its sections join the page's own order: floors directly under
          the room, the totals after the measurements that drive them. */}
      <aside className="min-w-0 space-y-8 max-lg:contents lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <section className="min-w-0 max-lg:order-1">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Choose a floor
          </h2>
          {/* Scrolls on its own so the totals below stay within reach. */}
          <div className="mt-3 lg:max-h-[26rem] lg:overflow-y-auto lg:p-1">
            <MaterialPicker choices={materials} selected={material} onSelect={setMaterial} />
          </div>
        </section>

        <section className="min-w-0 border-t border-border pt-6 max-lg:order-3">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What you need
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
          <section className="min-w-0 border-t border-border pt-6 max-lg:order-4">
            <p className="font-display text-lg leading-tight">{material.productName}</p>
            {material.variantName && (
              <p className="text-sm text-muted-foreground">{material.variantName}</p>
            )}

            <div className="mt-4 grid gap-2">
              <Button asChild className="h-11 w-full rounded-none">
                <Link href={`/product/${material.productSlug}`}>View this product</Link>
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
    </div>
  );
}

/** The visualizer's rule: a pattern from a dedicated texture, else the photograph. */
function layoutFor(material: TextureChoice): LayoutPattern {
  if (!material.isSeamless) return "natural";
  if (material.kind === "tile") return "grid";
  return material.kind === "plank" ? "staggered" : "natural";
}

/**
 * The floor the room opens with: a plank with its size on record if there is
 * one — boards at true size are what this tool shows best — then any plank,
 * then whatever comes first.
 */
function openingMaterial(materials: TextureChoice[]): TextureChoice | null {
  const planks = materials.filter((choice) => choice.kind === "plank");
  const measured = planks.find(
    (choice) => choice.variant?.dimensions.length_mm && choice.variant?.dimensions.width_mm,
  );

  return measured ?? planks[0] ?? materials[0] ?? null;
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
          ? "inline-flex h-9 items-center gap-2 whitespace-nowrap border border-charcoal-dark bg-charcoal-dark px-3 text-xs font-semibold text-primary-foreground sm:h-10 sm:px-4 sm:text-sm"
          : "inline-flex h-9 items-center gap-2 whitespace-nowrap border border-border px-3 text-xs transition hover:border-gold hover:text-gold sm:h-10 sm:px-4 sm:text-sm"
      }
    >
      <span className="hidden sm:contents">{icon}</span>
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
