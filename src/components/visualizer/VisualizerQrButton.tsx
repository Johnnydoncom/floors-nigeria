"use client";

import { QrCode as QrIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { QrCode } from "./QrCode";

/**
 * "Scan to see it in your room" — for someone browsing on a computer whose room
 * is best photographed, and viewed in AR, with their phone. The code opens the
 * visualizer with this product, and this variation, already chosen.
 *
 * Offered only where the pointer is a mouse; on a phone the visitor already
 * holds the device the code would send them to.
 */
export function VisualizerQrButton({
  productSlug,
  productName,
  variantSku,
  className,
}: {
  productSlug: string;
  productName: string;
  variantSku?: string | null;
  className?: string;
}) {
  const params = new URLSearchParams({ product: productSlug });
  if (variantSku) params.set("variant", variantSku);
  const url = absoluteUrl(`/visualizer?${params}`);

  return (
    <Popover
      onOpenChange={(open) =>
        open && track("qr_shown", { context: "product", product: productSlug })
      }
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show a QR code to open this in the visualizer on your phone"
          title="Open on your phone"
          className={cn(
            "hidden h-12 w-12 shrink-0 place-items-center rounded-md border border-border transition hover:border-foreground [@media(pointer:fine)]:grid",
            className,
          )}
        >
          <QrIcon className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-center" align="end">
        <p className="font-display text-sm font-semibold">See it in your room</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Scan with your phone to photograph your room — or view {productName} in AR.
        </p>
        <div className="mt-3 flex justify-center">
          <QrCode value={url} label={`Open ${productName} in the room visualizer on your phone`} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
