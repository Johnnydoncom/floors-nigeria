"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Loader2, ScanLine, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { track } from "@/lib/analytics";
import { checkArSupport, type ArHandle, type ArSupport } from "@/lib/room/ar-support";
import type { ArMaterialSpec } from "@/lib/room/ar-material";
import { QrCode } from "./QrCode";
import { cn } from "@/lib/utils";

/**
 * "View in your room" — one button, whichever AR the device has (§10).
 *
 * - Android Chrome: a live WebXR session; point at the floor, tap to place.
 * - iPhone and iPad: the material as a USDZ model in AR Quick Look.
 * - Anything else: a QR code to carry the same floor to a phone, and the 3D
 *   room, which works everywhere.
 *
 * three.js and the exporter are imported on first use, so the button costs the
 * page nothing until it is pressed.
 */
export function ArLauncher({
  spec,
  productName,
  phoneUrl,
  className,
  designerHref = "/room-designer",
}: {
  spec: ArMaterialSpec | null;
  productName: string;
  /** Where a phone should land to see this material, for the QR fallback. */
  phoneUrl: string;
  className?: string;
  designerHref?: string;
}) {
  const [support, setSupport] = useState<ArSupport>("checking");
  const [isBusy, setIsBusy] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ArHandle | null>(null);

  useEffect(() => {
    void checkArSupport().then(setSupport);
  }, []);

  // Leaving the page mid-session would otherwise strand the camera.
  useEffect(() => () => sessionRef.current?.end(), []);

  const launch = useCallback(async () => {
    if (!spec) return;

    setIsBusy(true);
    track("ar_launched", { mode: support, layout: spec.layout, kind: spec.kind });

    try {
      if (support === "quick-look") {
        const { openQuickLook } = await import("@/lib/room/quick-look");
        await openQuickLook(spec, productName);
      } else {
        const { startArSession } = await import("@/lib/room/ar-session");
        sessionRef.current = await startArSession({
          spec,
          overlay: overlayRef.current,
          onEnd: () => setIsRunning(false),
        });
        setIsRunning(true);
      }
    } catch {
      toast.error("AR would not start on this device. Try the 3D room instead.");
    } finally {
      setIsBusy(false);
    }
  }, [productName, spec, support]);

  if (support === "checking") {
    return (
      <Button variant="outline" disabled className={cn("h-11", className)}>
        <ScanLine aria-hidden />
        View in your room (AR)
      </Button>
    );
  }

  if (support === "webxr" || support === "quick-look") {
    return (
      <>
        <Button
          variant={isRunning ? "default" : "outline"}
          className={cn("h-11", className)}
          disabled={!spec || isBusy}
          onClick={isRunning ? () => sessionRef.current?.end() : launch}
        >
          {isBusy ? <Loader2 className="animate-spin" aria-hidden /> : <ScanLine aria-hidden />}
          {isRunning ? "Exit AR" : isBusy ? "Preparing AR…" : "View in your room (AR)"}
        </Button>

        {/* Shown over the camera feed during a WebXR session. */}
        <div
          ref={overlayRef}
          className={isRunning ? "fixed inset-x-0 bottom-0 z-50 p-6" : "hidden"}
        >
          {isRunning && (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
              <p className="rounded-md bg-charcoal-dark/80 px-4 py-2 text-sm text-primary-foreground">
                Point at your floor, then tap to place {productName}.
              </p>
              <Button className="h-11" onClick={() => sessionRef.current?.end()}>
                Exit AR
              </Button>
            </div>
          )}
        </div>
      </>
    );
  }

  // No AR here: offer the phone, and the 3D room.
  return (
    <Popover onOpenChange={(open) => open && track("qr_shown", { context: "ar" })}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-11", className)} disabled={!spec}>
          <Smartphone aria-hidden />
          View in your room (AR)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <p className="font-display text-sm font-semibold">AR runs on your phone</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {support === "insecure"
            ? "AR needs a secure (https) connection."
            : "Scan this with an iPhone or Android phone to place this floor in your room at its real size."}
        </p>
        <div className="mt-3 flex justify-center">
          <QrCode value={phoneUrl} label={`Open ${productName} in the visualizer on your phone`} />
        </div>
        <Button asChild variant="ghost" className="mt-3 h-10 w-full">
          <Link href={designerHref}>
            <Box aria-hidden />
            Or explore it in a 3D room
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
