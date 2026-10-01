"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { FormState } from "@/lib/account/form-state";

/**
 * A destructive account action behind a confirmation step. The dialog stays
 * open until the server answers, so a failure is reported where it happened.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  action,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  action: () => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await action();

      if (result.status === "error") {
        toast.error(result.message ?? "That didn't work. Please try again.");
        return;
      }

      setOpen(false);
      if (result.message) toast.success(result.message);
    });

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-11 rounded-none" disabled={pending}>
            Keep it
          </AlertDialogCancel>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
