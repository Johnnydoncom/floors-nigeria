"use client";

import { useCallback, useMemo, useState } from "react";
import { placementFor, toStageMaterial } from "@/lib/visualizer/placement";
import type { TemplateRoom } from "@/lib/visualizer/template-rooms";
import { DEFAULT_PLACEMENT, type Quad, type TextureChoice } from "@/lib/visualizer/types";
import { RoomStage } from "./RoomStage";
import { useFloorDetection } from "./useFloorDetection";

/**
 * The renderer behind the product page's room preview. Loaded only when the
 * preview nears the screen (`RoomPreview.tsx`), and only ever given template
 * rooms, so it never downloads the floor-detection model.
 */
export default function RoomPreviewCanvas({
  room,
  material,
  rotation,
}: {
  room: TemplateRoom;
  material: TextureChoice;
  rotation: number;
}) {
  const [found, setFound] = useState<{ src: string; quad: Quad; mask: HTMLCanvasElement } | null>(
    null,
  );

  const onDetected = useCallback(
    (quad: Quad, mask: CanvasImageSource) =>
      setFound({ src: room.src, quad, mask: mask as HTMLCanvasElement }),
    [room.src],
  );

  const detection = useFloorDetection({ photoSrc: room.src, preset: room.floor, onDetected });
  const current = found?.src === room.src ? found : null;

  const placement = useMemo(
    () => ({
      ...placementFor(material, { ...DEFAULT_PLACEMENT, widthM: room.floor.widthM ?? 4 }, false),
      rotation,
    }),
    [material, room.floor.widthM, rotation],
  );
  const stageMaterial = useMemo(() => toStageMaterial(material), [material]);
  const baked = useMemo(
    () =>
      room.floor.shading && room.floor.highlights
        ? { shading: room.floor.shading, highlights: room.floor.highlights }
        : null,
    [room.floor.shading, room.floor.highlights],
  );

  return (
    <RoomStage
      photoSrc={room.src}
      material={stageMaterial}
      compareMaterial={null}
      quad={current?.quad ?? room.floor.quad}
      placement={placement}
      mask={current?.mask ?? null}
      mode="wipe"
      tool="view"
      brush={{ mode: "add", size: 0.05 }}
      polygonDraft={[]}
      onPolygonDraftChange={noop}
      onQuadChange={noop}
      onMaskEdit={noop}
      detection={detection.state}
      baked={baked}
    />
  );
}

function noop(): void {}
