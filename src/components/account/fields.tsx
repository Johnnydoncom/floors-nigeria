import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/account/form-state";

/**
 * Form primitives for the account area. Every input is labelled and wired to
 * its error with `aria-describedby`, so a screen reader announces what is
 * wrong with the field it is on (§29).
 */

export const inputClass =
  "mt-1.5 h-12 w-full border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-gold focus-visible:ring-2 focus-visible:ring-gold/30 aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-60";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

function FieldShell({ id, label, error, hint, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn("text-sm", className)}>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-xs font-semibold"
      >
        <span>{label}</span>
        {optional && <span className="font-normal text-muted-foreground">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  fieldClassName?: string;
};

export function TextField({
  name,
  label,
  error,
  hint,
  optional,
  fieldClassName,
  className,
  ...input
}: TextFieldProps) {
  const id = `field-${name}`;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      optional={optional}
      className={fieldClassName}
    >
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputClass, className)}
        {...input}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  name: string;
  label: string;
  error?: string;
  optional?: boolean;
  fieldClassName?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({
  name,
  label,
  error,
  optional,
  fieldClassName,
  options,
  placeholder,
  className,
  ...select
}: SelectFieldProps) {
  const id = `field-${name}`;

  return (
    <FieldShell id={id} label={label} error={error} optional={optional} className={fieldClassName}>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={cn(inputClass, "appearance-auto pr-3", className)}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * The outcome of the last submission, announced to assistive technology.
 * Field-level problems are shown beside their fields; this carries the summary.
 */
export function FormAlert({ state, className }: { state: FormState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 border p-4 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-600/25 bg-emerald-500/5 text-emerald-800",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}
