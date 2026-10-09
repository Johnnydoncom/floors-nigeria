"use client";

import { useId, useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import type { MediaItem } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export type ContentMediaType = "page" | "post" | "portfolio";

/**
 * Images in one collection of a CMS record — the cover (one image, replaced
 * on upload) or a gallery (many). Uploads go through the shared media
 * endpoint, so they are resized and served like catalogue photography.
 */
export function ContentMedia({
  type,
  id,
  collection,
  items,
  multiple,
  editable,
  emptyLabel,
}: {
  type: ContentMediaType;
  id: number;
  collection: string;
  items: MediaItem[];
  multiple: boolean;
  editable: boolean;
  emptyLabel: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { run, pending } = useAdminMutation();

  async function upload(files: FileList | null) {
    if (!files?.length) return;

    for (const file of Array.from(multiple ? files : [files[0]])) {
      const form = new FormData();
      form.append("file", file);
      form.append("collection", collection);
      form.append("alt", file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
      const result = await run(() => adminRequest("POST", `media/${type}/${id}`, form), {
        success: multiple ? `${file.name} added.` : "Image updated.",
      });
      if (!result) break;
    }

    if (input.current) input.current.value = "";
  }

  return (
    <div>
      {items.length > 0 ? (
        <ul className={cn("grid gap-2", multiple ? "grid-cols-3" : "grid-cols-1")}>
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-md border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumb_url}
                alt={item.alt ?? ""}
                className={cn("w-full object-cover", multiple ? "aspect-square" : "aspect-[16/9]")}
              />
              {editable && (
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  disabled={pending}
                  onClick={() =>
                    run(() => adminRequest("DELETE", `media/${type}/${id}/${item.id}`), {
                      success: "Image removed.",
                    })
                  }
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-background/90 text-destructive opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      )}

      {editable && (
        <>
          <input
            ref={input}
            id={inputId}
            type="file"
            multiple={multiple}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(event) => upload(event.target.files)}
          />
          <label
            htmlFor={inputId}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            {multiple ? "Add photos" : items.length ? "Replace image" : "Upload image"}
          </label>
        </>
      )}
    </div>
  );
}
