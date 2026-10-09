"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import type { Option, SearchResult } from "@/lib/admin/types";

/**
 * Form building blocks for the workspace, and a schema-driven form so server
 * pages can describe a create/edit form as plain data.
 */

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-gold/30 aria-[invalid=true]:border-destructive disabled:opacity-60";

export function FieldShell({
  id,
  label,
  error,
  help,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 text-sm", className)}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "textarea"
  | "select"
  | "switch"
  | "date"
  | "datetime"
  | "color"
  | "checkboxes"
  | "search";

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** Full width in the two-column grid. */
  wide?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  /** For `search`: what to look up, and the label of the current value. */
  search?: "customers" | "quotes" | "projects" | "variants";
  searchLabel?: string;
  /** Offer an empty choice in a select. */
  nullable?: boolean;
};

type Values = Record<string, unknown>;

function toLocalInput(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValue(field: FieldSpec, value: unknown): unknown {
  switch (field.type) {
    case "switch":
      return Boolean(value);
    case "checkboxes":
      return Array.isArray(value) ? value.map(String) : [];
    case "datetime":
      return toLocalInput(value);
    case "date":
      return typeof value === "string" ? value.slice(0, 10) : "";
    default:
      return value === null || value === undefined ? "" : String(value);
  }
}

/** Turn form state into the JSON the API expects. */
function payloadFrom(fields: FieldSpec[], values: Values): Values {
  const payload: Values = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.type === "checkboxes") {
      const ids = field.options?.every((option) => /^\d+$/.test(option.value));
      payload[field.name] = ids ? (value as string[]).map(Number) : value;
    } else if (field.type === "switch") {
      payload[field.name] = value;
    } else if (value === "" || value === undefined) {
      payload[field.name] = null;
    } else if (
      field.type === "number" ||
      (field.type === "select" &&
        /^\d+$/.test(String(value)) &&
        field.options?.every((o) => /^\d+$/.test(o.value)))
    ) {
      payload[field.name] = Number(value);
    } else if (field.type === "search") {
      payload[field.name] = Number(value);
    } else if (field.type === "datetime") {
      payload[field.name] = new Date(String(value)).toISOString();
    } else {
      payload[field.name] = value;
    }
  }

  return payload;
}

export function ResourceForm({
  fields,
  initial = {},
  endpoint,
  method = "POST",
  submitLabel = "Save",
  successMessage,
  redirectTo,
  onDone,
  extra,
  columns = 2,
}: {
  fields: FieldSpec[];
  initial?: Values;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  submitLabel?: string;
  successMessage?: string;
  /** A path, with `:id` replaced by the created record's id. */
  redirectTo?: string;
  onDone?: () => void;
  /** Fixed values sent with every submission. */
  extra?: Values;
  columns?: 1 | 2;
}) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, initialValue(field, initial[field.name])]),
    ),
  );
  const { run, pending, errors } = useAdminMutation();
  const formId = useId();

  function set(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const result = await run(
      () =>
        adminRequest<{ data?: { id?: number } }>(method, endpoint, {
          ...payloadFrom(fields, values),
          ...extra,
        }),
      {
        success: successMessage ?? "Saved.",
        redirectTo: redirectTo
          ? (created) =>
              redirectTo.replace(
                ":id",
                String((created as { data?: { id?: number } })?.data?.id ?? ""),
              )
          : undefined,
      },
    );

    if (result) onDone?.();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
        {fields.map((field) => (
          <Field
            key={field.name}
            id={`${formId}-${field.name}`}
            field={field}
            value={values[field.name]}
            error={errors[field.name]?.[0]}
            onChange={(value) => set(field.name, value)}
            className={cn(field.wide && "sm:col-span-2")}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary h-10 rounded-md px-5">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Field({
  id,
  field,
  value,
  error,
  onChange,
  className,
}: {
  id: string;
  field: FieldSpec;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  className?: string;
}) {
  const described = error ? `${id}-error` : field.help ? `${id}-help` : undefined;
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": described,
    required: field.required,
  };

  if (field.type === "switch") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5",
          className,
        )}
      >
        <div>
          <label htmlFor={id} className="text-sm font-medium">
            {field.label}
          </label>
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  let control: ReactNode;

  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          {...common}
          rows={4}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClass, "h-auto py-2")}
        />
      );
      break;
    case "select":
      control = (
        <select
          {...common}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          {(field.nullable || !field.required) && (
            <option value="">{field.placeholder ?? "— None —"}</option>
          )}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case "checkboxes": {
      const selected = new Set((value as string[]) ?? []);
      control = (
        <div
          id={id}
          className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2"
        >
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(option.value);
                  else next.delete(option.value);
                  onChange([...next]);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "search":
      control = (
        <RecordPicker
          id={id}
          type={field.search ?? "customers"}
          value={value ? Number(value) : null}
          label={field.searchLabel ?? null}
          onChange={(picked) => onChange(picked?.id ?? "")}
          invalid={Boolean(error)}
        />
      );
      break;
    case "color":
      control = (
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`${field.label} picker`}
            value={/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : "#c9a227"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <input
            {...common}
            value={String(value ?? "")}
            placeholder="#C9A227"
            onChange={(event) => onChange(event.target.value)}
            className={inputClass}
          />
        </div>
      );
      break;
    default:
      control = (
        <input
          {...common}
          type={field.type === "datetime" ? "datetime-local" : field.type}
          inputMode={field.type === "number" ? "decimal" : undefined}
          min={field.min}
          max={field.max}
          step={field.step}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      );
  }

  return (
    <FieldShell
      id={id}
      label={field.label}
      error={error}
      help={field.help}
      required={field.required}
      className={className}
    >
      {control}
    </FieldShell>
  );
}

/**
 * A type-ahead picker for linking records — the customer on a quote, the
 * product on a quote line, the quote behind an appointment.
 */
export function RecordPicker({
  id,
  type,
  value,
  label,
  onChange,
  invalid,
  customer,
  placeholder = "Search…",
}: {
  id?: string;
  type: "customers" | "quotes" | "projects" | "variants";
  value: number | null;
  label: string | null;
  onChange: (picked: SearchResult | null) => void;
  invalid?: boolean;
  customer?: number | null;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<string | null>(label);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type, q: query });
        if (customer) params.set("customer", String(customer));
        const response = await adminRequest<{ data: SearchResult[] }>(
          "GET",
          `lookups/search?${params}`,
        );
        setResults(response.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, query, type, customer]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex min-w-0 gap-1">
        <PopoverTrigger
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(inputClass, "flex min-w-0 items-center justify-between gap-2 text-left")}
        >
          <span className={cn("truncate", !current && "text-muted-foreground")}>
            {value ? (current ?? `#${value}`) : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setCurrent(null);
              onChange(null);
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="h-10 w-full bg-transparent text-sm outline-none"
            aria-label={placeholder}
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
        <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
          {!loading && results.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matches.</li>
          )}
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                role="option"
                aria-selected={result.id === value}
                onClick={() => {
                  setCurrent(result.label);
                  onChange(result);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    result.id === value ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate">{result.label}</span>
                  {result.detail && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {result.detail}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A button that opens a dialog holding a ResourceForm; it closes itself when
 * the form saves.
 */
export function FormDialog({
  trigger,
  title,
  description,
  wide,
  defaultOpen = false,
  ...form
}: Parameters<typeof ResourceForm>[0] & {
  trigger: ReactNode;
  title: string;
  description?: string;
  wide?: boolean;
  /** Open on arrival, e.g. from a "New quote" link elsewhere. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // A fresh form each time the dialog opens.
  const [generation, setGeneration] = useState(0);

  const key = useMemo(() => `${generation}`, [generation]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setGeneration((value) => value + 1);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn("max-h-[90vh] overflow-y-auto", wide ? "sm:max-w-3xl" : "sm:max-w-xl")}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ResourceForm key={key} {...form} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
