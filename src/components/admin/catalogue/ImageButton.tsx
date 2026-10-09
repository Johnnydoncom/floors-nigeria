"use client";

import { useId, useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

/**
 * The image on a category, brand, collection, room or attribute term: shows
 * the current one and replaces it on upload.
 */
export function ImageButton({
  type,
  id,
  url,
  label,
  editable,
  size = "md",
  swatch,
}: {
  type: "category" | "brand" | "collection" | "taxonomy" | "term";
  id: number;
  url: string | null;
  label: string;
  editable: boolean;
  size?: "sm" | "md";
  /** A colour to show when there is no image (attribute terms). */
  swatch?: string | null;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { run, pending } = useAdminMutation();
  const box = size === "sm" ? "h-8 w-8" : "h-12 w-12";

  async function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await run(() => adminRequest("POST", `media/${type}/${id}`, form), {
      success: "Image updated.",
    });
    if (input.current) input.current.value = "";
  }

  const preview = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn(box, "rounded object-cover")} />
  ) : (
    <span
      className={cn(
        box,
        "grid place-items-center rounded border border-dashed border-border text-muted-foreground",
      )}
      style={swatch ? { background: swatch, borderStyle: "solid" } : undefined}
    >
      {!swatch && <ImagePlus className="h-4 w-4" aria-hidden />}
    </span>
  );

  if (!editable) return preview;

  return (
    <>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <label
        htmlFor={inputId}
        className="relative inline-block cursor-pointer"
        title={`Upload an image for ${label}`}
      >
        <span className="sr-only">Upload an image for {label}</span>
        {preview}
        {pending && (
          <span className="absolute inset-0 grid place-items-center rounded bg-background/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          </span>
        )}
      </label>
    </>
  );
}
