"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Columns2,
  Copy,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { QrCode } from "./QrCode";

/**
 * Save and share a design (§10).
 *
 * Opening the dialog saves the design — sharing is the reason to save — and
 * then offers every way people actually pass a room around: the phone's own
 * share sheet (with the picture attached where the browser allows), WhatsApp,
 * email, a copied link, a QR code for the person standing next to you, and the
 * image itself.
 */
export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  isSaving,
  onSave,
  title,
  renderImage,
  renderBeforeAfter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string | null;
  isSaving: boolean;
  /** Saves the design if it has not been saved since it last changed. */
  onSave: () => Promise<string | null>;
  title: string;
  renderImage: () => Promise<Blob | null>;
  renderBeforeAfter: () => Promise<Blob | null>;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Save once per opening. A failed save offers "Try again" rather than
  // retrying by itself in a loop.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      attemptedRef.current = false;
      return;
    }

    if (!shareUrl && !attemptedRef.current) {
      attemptedRef.current = true;
      void onSave();
    }
  }, [open, shareUrl, onSave]);

  const message = `Here's ${title} in my room — what do you think?`;

  const nativeShare = async () => {
    const url = shareUrl ?? (await onSave());
    if (!url) return;

    const image = await renderBeforeAfter();
    const file = image ? new File([image], "floor-nigeria-room.jpg", { type: "image/jpeg" }) : null;
    const withFile = file && navigator.canShare?.({ files: [file] });

    try {
      await navigator.share({
        title: "My room, visualised",
        text: message,
        url,
        ...(withFile ? { files: [file] } : {}),
      });
      track("design_shared", { channel: "native", with_image: Boolean(withFile) });
    } catch {
      // Dismissing the share sheet rejects; nothing to report.
    }
  };

  const download = async (kind: "after" | "before-after") => {
    const blob = kind === "after" ? await renderImage() : await renderBeforeAfter();

    if (!blob) {
      toast.error("The image could not be created. Try again.");
      return;
    }

    const { downloadBlob } = await import("@/lib/visualizer/images");
    downloadBlob(blob, `floor-nigeria-${kind}.${blob.type === "image/png" ? "png" : "jpg"}`);
    track("image_downloaded", { kind });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Save &amp; share</DialogTitle>
          <DialogDescription>
            Anyone with the link can see this room — no account needed. Handy for the person paying
            for the floor.
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <>
            <div className="flex items-center gap-2 rounded-md border border-gold/40 bg-gold/5 p-2">
              <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs">{shareUrl}</span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    track("design_shared", { channel: "copy" });
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast.error("Copying was blocked. Select the link and copy it instead.");
                  }
                }}
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {canNativeShare && (
                <Button className="col-span-2 h-11" onClick={nativeShare}>
                  <Share2 aria-hidden />
                  Share…
                </Button>
              )}
              <Button asChild variant="outline" className="h-11">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("design_shared", { channel: "whatsapp" })}
                >
                  <MessageCircle aria-hidden />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <a
                  href={`mailto:?subject=${encodeURIComponent("My room, visualised")}&body=${encodeURIComponent(`${message}\n\n${shareUrl}`)}`}
                  onClick={() => track("design_shared", { channel: "email" })}
                >
                  <Mail aria-hidden />
                  Email
                </a>
              </Button>
            </div>

            <div className="flex items-center gap-4 rounded-md border border-border p-3">
              <QrCode value={shareUrl} size={112} label="QR code for this design" />
              <p className="text-xs text-muted-foreground">
                Scan to open this design on another phone or tablet — or to try it in AR on your
                own.
              </p>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving your design…
              </>
            ) : (
              <>
                We could not save just now.
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => void onSave()}
                >
                  Try again
                </button>
              </>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
          <Button variant="ghost" className="h-10" onClick={() => void download("after")}>
            <Download aria-hidden />
            Image
          </Button>
          <Button variant="ghost" className="h-10" onClick={() => void download("before-after")}>
            <Columns2 aria-hidden />
            Before &amp; after
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
