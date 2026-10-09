"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

export const buttonStyles = {
  primary: "btn btn-primary h-9 rounded-md px-4 text-xs",
  outline: "btn btn-outline h-9 rounded-md px-4 text-xs bg-background",
  danger:
    "btn h-9 rounded-md border border-destructive/40 px-4 text-xs text-destructive hover:bg-destructive/10",
  ghost:
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
} as const;

/** One click → one API call, with a toast and a page refresh. */
export function ActionButton({
  endpoint,
  method = "POST",
  body,
  children,
  variant = "outline",
  success,
  redirectTo,
  className,
  disabled,
}: {
  endpoint: string;
  method?: Method;
  body?: unknown;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  success?: string;
  redirectTo?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { run, pending } = useAdminMutation();

  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={() => run(() => adminRequest(method, endpoint, body), { success, redirectTo })}
      className={cn(buttonStyles[variant], className)}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/**
 * An action that needs a second thought — deleting, archiving, sending —
 * confirmed in a dialog that says what will happen.
 */
export function ConfirmAction({
  endpoint,
  method = "DELETE",
  body,
  title,
  description,
  confirmLabel = "Delete",
  children,
  variant = "danger",
  success,
  redirectTo,
  className,
}: {
  endpoint: string;
  method?: Method;
  body?: unknown;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  success?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAdminMutation();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button type="button" className={cn(buttonStyles[variant], className)}>
          {children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async (event) => {
              event.preventDefault();
              const result = await run(() => adminRequest(method, endpoint, body), {
                success,
                redirectTo,
              });
              if (result) setOpen(false);
            }}
            className={
              variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** A select that saves as soon as it changes — status and owner pickers. */
export function InlineSelect({
  endpoint,
  method = "PATCH",
  field,
  value,
  options,
  label,
  extra,
  nullable,
  asArray,
  className,
}: {
  endpoint: string;
  method?: Method;
  field: string;
  /** Send the choice as a one-item list (e.g. `roles`). */
  asArray?: boolean;
  value: string | number | null;
  options: { value: string; label: string }[];
  label: string;
  extra?: Record<string, unknown>;
  nullable?: boolean;
  className?: string;
}) {
  const { run, pending } = useAdminMutation();
  const [current, setCurrent] = useState(value === null ? "" : String(value));

  return (
    <label className={cn("inline-flex items-center gap-2 text-xs", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={current}
        disabled={pending}
        aria-label={label}
        onChange={async (event) => {
          const next = event.target.value;
          const previous = current;
          setCurrent(next);
          const numeric =
            /^\d+$/.test(next) && options.every((option) => /^\d+$/.test(option.value));
          const result = await run(() =>
            adminRequest(method, endpoint, {
              [field]:
                next === ""
                  ? asArray
                    ? []
                    : null
                  : asArray
                    ? [next]
                    : numeric
                      ? Number(next)
                      : next,
              ...extra,
            }),
          );
          if (!result) setCurrent(previous);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        {nullable && <option value="">Unassigned</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
      )}
    </label>
  );
}
