"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import { FieldShell, inputClass } from "./forms";
import type { Setting } from "@/lib/admin/types";

const GROUPS: Record<string, { title: string; description: string }> = {
  general: {
    title: "Business",
    description: "Contact details shown across the website and in emails.",
  },
  commerce: { title: "Quotes & VAT", description: "Applied when the sales team prices a quote." },
  calculator: { title: "Floor calculator", description: "Defaults for the material calculator." },
  service: { title: "Service areas", description: "Where Floor Nigeria delivers and installs." },
  visualizer: { title: "Room visualizer", description: "The photo visualizer on the website." },
};

type Values = Record<string, unknown>;

/**
 * Business settings, rendered from the API's own schema so a new setting
 * appears here without a frontend change.
 */
export function SettingsForm({
  settings,
  states,
  editable,
}: {
  settings: Setting[];
  states: string[];
  editable: boolean;
}) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
  );
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const { run, pending, errors } = useAdminMutation();

  function set(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty((current) => new Set(current).add(key));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const changed = Object.fromEntries([...dirty].map((key) => [key, values[key]]));
    const result = await run(() => adminRequest("PUT", "settings", { settings: changed }), {
      success: "Settings saved.",
    });
    if (result) setDirty(new Set());
  }

  const groups = [...new Set(settings.map((setting) => setting.group))];

  return (
    <form onSubmit={save} className="space-y-6">
      <fieldset disabled={!editable} className="space-y-6">
        {groups.map((group) => (
          <section key={group} className="rounded-lg border border-border bg-background p-5">
            <h2 className="font-display text-base font-semibold">
              {GROUPS[group]?.title ?? group}
            </h2>
            {GROUPS[group] && (
              <p className="text-xs text-muted-foreground">{GROUPS[group].description}</p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {settings
                .filter((setting) => setting.group === group)
                .map((setting) => (
                  <SettingField
                    key={setting.key}
                    setting={setting}
                    value={values[setting.key]}
                    onChange={(value) => set(setting.key, value)}
                    error={
                      errors[`settings.${setting.key}`]?.[0] ??
                      Object.entries(errors).find(([field]) =>
                        field.startsWith(`settings.${setting.key}`),
                      )?.[1]?.[0]
                    }
                    states={states}
                  />
                ))}
            </div>
          </section>
        ))}
      </fieldset>
      {editable && (
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-surface/95 py-3">
          {dirty.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {dirty.size} unsaved change{dirty.size === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="submit"
            disabled={pending || dirty.size === 0}
            className="btn btn-primary h-10 rounded-md px-5 text-xs"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save settings
          </button>
        </div>
      )}
    </form>
  );
}

function SettingField({
  setting,
  value,
  onChange,
  error,
  states,
}: {
  setting: Setting;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  states: string[];
}) {
  const id = `setting-${setting.key.replace(/\W/g, "-")}`;

  if (setting.input === "switch") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
        {setting.label}
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </label>
    );
  }

  if (setting.input === "states") {
    const selected = new Set((value as string[] | null) ?? []);
    return (
      <FieldShell id={id} label={setting.label} error={error} className="sm:col-span-2">
        <div id={id} className="flex flex-wrap gap-1.5">
          {states.map((state) => {
            const on = selected.has(state);
            return (
              <button
                key={state}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(
                    on ? [...selected].filter((item) => item !== state) : [...selected, state],
                  )
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  on
                    ? "border-foreground bg-charcoal-dark text-primary-foreground"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {state}
              </button>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  if (setting.input === "hours") {
    const hours = (value as Record<string, string> | null) ?? {};
    return (
      <FieldShell
        id={id}
        label={setting.label}
        help={setting.help ?? undefined}
        error={error}
        className="sm:col-span-2"
      >
        <div id={id} className="grid gap-2 sm:grid-cols-3">
          {(["weekdays", "saturday", "sunday"] as const).map((day) => (
            <label key={day} className="text-xs">
              <span className="capitalize text-muted-foreground">
                {day === "weekdays" ? "Mon–Fri" : day}
              </span>
              <input
                value={hours[day] ?? ""}
                onChange={(event) => onChange({ ...hours, [day]: event.target.value })}
                className={cn(inputClass, "mt-1")}
              />
            </label>
          ))}
        </div>
      </FieldShell>
    );
  }

  if (setting.input.startsWith("select:")) {
    const options = setting.input
      .slice(7)
      .split(",")
      .map((pair) => pair.split("="));
    return (
      <FieldShell id={id} label={setting.label} error={error}>
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          {options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (setting.input === "textarea") {
    return (
      <FieldShell
        id={id}
        label={setting.label}
        help={setting.help ?? undefined}
        error={error}
        className="sm:col-span-2"
      >
        <textarea
          id={id}
          rows={3}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClass, "h-auto py-2")}
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell id={id} label={setting.label} help={setting.help ?? undefined} error={error}>
      <input
        id={id}
        type={setting.input === "number" ? "number" : setting.input}
        step={setting.input === "number" ? "any" : undefined}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(
            setting.input === "number"
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
    </FieldShell>
  );
}
