"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { inputClass } from "@/components/admin/forms";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ─── API shapes ─────────────────────────────────────────────────────────── */

type SettingEntry = { key: string; value: unknown; is_secret?: boolean };

type Provider = {
  id: string;
  label: string;
  free: boolean;
  self_hosted: boolean;
  requires_key: boolean;
  supports_embeddings: boolean;
  has_key: boolean;
  base_url: string;
  default_base_url: string;
  suggested_model: string;
  suggested_embedding_model: string;
  key_url: string;
  note: string;
  configured: boolean;
};

type ModelEntry = { provider: string; model: string };

type ChannelStatus = { webhook_url: string; configured: boolean };

type SettingsResponse = {
  settings: SettingEntry[];
  providers: Provider[];
  models: ModelEntry[];
  active_models: number;
  channels: Record<string, ChannelStatus>;
};

type CatalogModel = { id: string; label: string; free: boolean; context: number | null };

type ModelOptions = {
  status: "loading" | "ready" | "error";
  models: CatalogModel[];
  error?: string;
};

type TestResult =
  | { status: "running" }
  | { status: "ok"; reply: string; latency: number }
  | { status: "error"; error: string };

type Row = ModelEntry & { uid: string };

/* ─── Constants ──────────────────────────────────────────────────────────── */

const MASK = "••••••••";
const MODELS_KEY = "ai_support.ai.models";

const CHANNEL_LABELS = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
} as const;

const FEATURE_SWITCHES = [
  [
    "ai_support.enabled",
    "AI support module",
    "Master switch. Off hides the chat widget and stops every AI reply.",
  ],
  [
    "ai_support.feature.auto_reply",
    "AI auto-reply",
    "The AI answers customers on every enabled channel.",
  ],
  [
    "ai_support.feature.human_support",
    "Human inbox",
    "Customers can ask for a person; agents reply from the inbox.",
  ],
  ["ai_support.feature.copilot", "Agent copilot", "Agents can ask the AI to draft a reply."],
  [
    "ai_support.feature.lead_capture",
    "Lead capture",
    "Customers can leave contact details; a CRM lead is created.",
  ],
  [
    "ai_support.feature.ingestion",
    "Knowledge base",
    "Approved knowledge sources are indexed and used in answers.",
  ],
] as const;

const LIMIT_FIELDS = [
  [
    "ai_support.budget.daily_usd",
    "Daily budget (USD)",
    "Paid models only. 0 removes the cap. Free models never count.",
  ],
  ["ai_support.rate_limit.messages_per_minute", "Messages per minute", "Per visitor."],
  ["ai_support.rate_limit.messages_per_session", "Messages per conversation", ""],
  [
    "ai_support.retention.days",
    "Keep conversations (days)",
    "Applied by php artisan ai-support:cleanup.",
  ],
  [
    "ai_support.calculator.waste_default",
    "Waste allowance (%)",
    "Added by the quantity calculator.",
  ],
] as const;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/ai-support/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { message?: string }).message;
    throw new Error(message || `Request failed (${res.status}).`);
  }
  return body as T;
}

const providerKeySetting = (id: string) => `ai_support.providers.${id}.api_key`;
const providerUrlSetting = (id: string) => `ai_support.providers.${id}.base_url`;

let rowCounter = 0;
const toRow = (entry: ModelEntry): Row => ({ ...entry, uid: `row-${++rowCounter}` });

function normaliseValue(value: unknown): string | boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function asBoolean(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1";
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SupportSettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, string | boolean>>({});
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [removedSecrets, setRemovedSecrets] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [initialModels, setInitialModels] = useState("[]");
  const [options, setOptions] = useState<Record<string, ModelOptions>>({});
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();

  const providers = useMemo(() => data?.providers ?? [], [data]);
  const providerById = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p])) as Record<string, Provider>,
    [providers],
  );
  const secretSet = useMemo(
    () => new Set((data?.settings ?? []).filter((s) => s.value === MASK).map((s) => s.key)),
    [data],
  );

  /** Unsaved key/base URL win, so models can be listed and tested before saving. */
  const connectionFor = useCallback(
    (id: string) => {
      const key = secrets[providerKeySetting(id)]?.trim();
      const url = String(values[providerUrlSetting(id)] ?? "").trim();
      return { ...(key ? { api_key: key } : {}), ...(url ? { base_url: url } : {}) };
    },
    [secrets, values],
  );

  const isUsable = useCallback(
    (id: string) => {
      const provider = providerById[id];
      if (!provider) return false;
      if (removedSecrets.includes(providerKeySetting(id))) return !provider.requires_key;
      return provider.configured || Boolean(secrets[providerKeySetting(id)]?.trim());
    },
    [providerById, removedSecrets, secrets],
  );

  const loadOptions = useCallback(
    async (id: string, force = false) => {
      if (!force && options[id] && options[id].status !== "error") return;
      setOptions((prev) => ({
        ...prev,
        [id]: { status: "loading", models: prev[id]?.models ?? [] },
      }));
      try {
        const result = await adminFetch<{ models: CatalogModel[] }>(`providers/${id}/models`, {
          method: "POST",
          body: JSON.stringify(connectionFor(id)),
        });
        setOptions((prev) => ({ ...prev, [id]: { status: "ready", models: result.models } }));
      } catch (err) {
        setOptions((prev) => ({
          ...prev,
          [id]: {
            status: "error",
            models: [],
            error: err instanceof Error ? err.message : "Could not load models.",
          },
        }));
      }
    },
    [connectionFor, options],
  );

  /**
   * Applies the server state. `isCurrent` lets the mount effect drop a
   * response that arrives after its cleanup, so a slow load can never
   * overwrite rows (and edits) the admin has already started on.
   */
  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    const result = await adminFetch<SettingsResponse>("settings");
    if (!isCurrent()) return;
    const nextValues: Record<string, string | boolean> = {};
    for (const entry of result.settings) {
      if (!entry.is_secret && entry.key !== MODELS_KEY)
        nextValues[entry.key] = normaliseValue(entry.value);
    }
    setData(result);
    setValues(nextValues);
    setInitialValues(nextValues);
    setSecrets({});
    setRemovedSecrets([]);
    setRows(result.models.map(toRow));
    setInitialModels(JSON.stringify(result.models));
  }, []);

  useEffect(() => {
    let current = true;
    load(() => current).catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load settings."),
    );
    return () => {
      current = false;
    };
  }, [load]);

  const modelsPayload = JSON.stringify(
    rows.map(({ provider, model }) => ({ provider, model: model.trim() })),
  );
  const changedKeys = Object.keys(values).filter((key) => values[key] !== initialValues[key]);
  const typedSecrets = Object.entries(secrets).filter(([, value]) => value.trim() !== "");
  const isDirty =
    changedKeys.length > 0 ||
    typedSecrets.length > 0 ||
    removedSecrets.length > 0 ||
    modelsPayload !== initialModels;

  const save = () =>
    startSaving(async () => {
      setError(null);
      const updates: { key: string; value: unknown }[] = [
        ...changedKeys.map((key) => ({ key, value: values[key] })),
        ...typedSecrets.map(([key, value]) => ({ key, value: value.trim() })),
        ...removedSecrets.map((key) => ({ key, value: null })),
      ];
      if (modelsPayload !== initialModels) {
        updates.push({ key: MODELS_KEY, value: JSON.parse(modelsPayload) });
      }
      try {
        await adminFetch("settings", {
          method: "PATCH",
          body: JSON.stringify({ settings: updates }),
        });
        await load();
        setOptions({});
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save settings.");
      }
    });

  const runTest = async (row: Row) => {
    setTests((prev) => ({ ...prev, [row.uid]: { status: "running" } }));
    try {
      const result = await adminFetch<{
        ok: boolean;
        reply?: string;
        error?: string;
        latency_ms: number;
      }>(`providers/${row.provider}/test`, {
        method: "POST",
        body: JSON.stringify({ model: row.model.trim(), ...connectionFor(row.provider) }),
      });
      setTests((prev) => ({
        ...prev,
        [row.uid]: result.ok
          ? { status: "ok", reply: result.reply ?? "", latency: result.latency_ms }
          : { status: "error", error: result.error ?? "The model did not answer." },
      }));
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [row.uid]: { status: "error", error: err instanceof Error ? err.message : "Test failed." },
      }));
    }
  };

  const setValue = (key: string, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const updateRow = (uid: string, patch: Partial<ModelEntry>) => {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
    setTests((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };
  const moveRow = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });

  if (!data) {
    return (
      <div className="p-6">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
          </p>
        )}
      </div>
    );
  }

  const moduleOn = asBoolean(values["ai_support.enabled"]);
  const usableRows = rows.filter(
    (row) =>
      isUsable(row.provider) && (row.model.trim() || providerById[row.provider]?.suggested_model),
  );
  const liveChannels = (["website", "whatsapp", "instagram"] as const).filter((channel) =>
    asBoolean(values[`ai_support.channel.${channel}`]),
  );

  /* ─── Render helpers ─── */

  const switchRow = (key: string, label: string, help: string, extra?: ReactNode) => (
    <div key={key} className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={key} className="text-sm font-medium">
          {label}
        </label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
        {extra}
      </div>
      <Switch
        id={key}
        checked={asBoolean(values[key])}
        onCheckedChange={(checked) => setValue(key, checked)}
      />
    </div>
  );

  const textField = (
    key: string,
    label: string,
    help = "",
    type: "text" | "number" = "text",
    placeholder = "",
  ) => (
    <div key={key} className="text-sm">
      <label htmlFor={key} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <input
        id={key}
        type={type}
        step={type === "number" ? "any" : undefined}
        placeholder={placeholder}
        value={String(values[key] ?? "")}
        onChange={(e) => setValue(key, e.target.value)}
        className={inputClass}
      />
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  );

  const secretField = (key: string, label: string, help = "") => {
    const saved = secretSet.has(key) && !removedSecrets.includes(key);
    return (
      <SecretInput
        key={key}
        id={key}
        label={label}
        help={help}
        saved={saved}
        value={secrets[key] ?? ""}
        onChange={(value) => setSecrets((prev) => ({ ...prev, [key]: value }))}
        onRemove={saved ? () => setRemovedSecrets((prev) => [...prev, key]) : undefined}
      />
    );
  };

  const webhook = (channel: "whatsapp" | "instagram") => {
    const status = data.channels[channel];
    if (!status) return null;
    return (
      <div className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-all font-mono text-xs text-muted-foreground">
          {status.webhook_url}
        </p>
        <CopyButton text={status.webhook_url} />
      </div>
    );
  };

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="AI Support"
        title="Settings"
        description="Turn features on, choose which AI models answer customers, and connect WhatsApp and Instagram."
        actions={
          <>
            {savedAt && (
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || isSaving}
              className="btn btn-primary flex h-9 items-center gap-2 rounded-md px-4 text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isDirty ? "Save changes" : "No changes"}
            </button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Status strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatusCard
          label="Module"
          ok={moduleOn}
          value={moduleOn ? "On" : "Off"}
          hint={moduleOn ? "Customers can reach the assistant." : "Turn it on under General."}
        />
        <StatusCard
          label="AI models ready"
          ok={usableRows.length > 0}
          value={`${usableRows.length} of ${rows.length}`}
          hint={
            usableRows.length > 0
              ? "Tried in order until one answers."
              : "Add a provider key under AI models."
          }
        />
        <StatusCard
          label="Channels on"
          ok={liveChannels.length > 0}
          value={
            liveChannels.length ? liveChannels.map((c) => CHANNEL_LABELS[c]).join(", ") : "None"
          }
          hint="Website chat, WhatsApp, Instagram."
        />
      </div>

      <Tabs defaultValue="models">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="models">AI models</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="widget">Chat widget</TabsTrigger>
        </TabsList>

        {/* ─── General ─── */}
        <TabsContent value="general" className="space-y-6">
          <Panel title="Features">
            <div className="divide-y">
              {FEATURE_SWITCHES.map(([key, label, help]) => switchRow(key, label, help))}
            </div>
          </Panel>
          <Panel title="Limits">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LIMIT_FIELDS.map(([key, label, help]) => textField(key, label, help, "number"))}
            </div>
          </Panel>
        </TabsContent>

        {/* ─── AI models ─── */}
        <TabsContent value="models" className="space-y-6">
          <Panel
            title="Model priority"
            description="Tried top to bottom. If one fails, is rate-limited or has been retired, the next answers. Rows whose provider has no key are skipped."
            actions={
              <button
                type="button"
                onClick={() => {
                  const provider = providers.find((p) => isUsable(p.id)) ?? providers[0];
                  setRows((prev) => [
                    ...prev,
                    toRow({ provider: provider.id, model: provider.suggested_model }),
                  ]);
                }}
                className="btn btn-outline flex h-8 items-center gap-1 rounded-md px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add model
              </button>
            }
          >
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No models yet. Add one — Groq, OpenRouter (models ending in &quot;:free&quot;) and
                Gemini all have free tiers.
              </p>
            ) : (
              <ol className="space-y-3">
                {rows.map((row, index) => {
                  const provider = providerById[row.provider];
                  const usable = isUsable(row.provider);
                  const catalog = options[row.provider];
                  const known = catalog?.models.find((m) => m.id === row.model.trim());
                  const test = tests[row.uid];
                  const listId = `models-${row.uid}`;
                  return (
                    <li
                      key={row.uid}
                      className={cn("rounded-md border p-3", !usable && "bg-muted/40")}
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                        <span className="mt-2 hidden w-5 shrink-0 text-xs font-semibold text-muted-foreground lg:block">
                          {index + 1}.
                        </span>
                        <select
                          aria-label="Provider"
                          value={row.provider}
                          onChange={(e) => {
                            const next = providerById[e.target.value];
                            updateRow(row.uid, { provider: next.id, model: next.suggested_model });
                          }}
                          className={cn(inputClass, "lg:w-52")}
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                              {p.free ? " (free)" : ""}
                            </option>
                          ))}
                        </select>
                        <div className="min-w-0 flex-1">
                          <input
                            aria-label="Model"
                            list={listId}
                            value={row.model}
                            placeholder={provider?.suggested_model || "model id"}
                            onFocus={() => usable && loadOptions(row.provider)}
                            onChange={(e) => updateRow(row.uid, { model: e.target.value })}
                            className={cn(inputClass, "font-mono text-xs")}
                          />
                          <datalist id={listId}>
                            {catalog?.models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.free ? "Free" : "Paid"}
                                {m.context ? ` · ${Math.round(m.context / 1000)}k context` : ""}
                              </option>
                            ))}
                          </datalist>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {!usable && (
                              <StatusBadge
                                value="skipped"
                                label="Skipped — no key for this provider"
                                tone="warning"
                              />
                            )}
                            {known && (
                              <StatusBadge
                                value="free"
                                label={known.free ? "Free" : "Paid"}
                                tone={known.free ? "success" : "neutral"}
                              />
                            )}
                            {usable && catalog?.status === "loading" && (
                              <span>Loading models…</span>
                            )}
                            {usable &&
                              catalog?.status === "ready" &&
                              !known &&
                              row.model.trim() && (
                                <span className="text-orange-700">
                                  Not in this provider&apos;s current list — test it.
                                </span>
                              )}
                            {usable && catalog?.status === "ready" && (
                              <span>
                                {catalog.models.filter((m) => m.free).length} free of{" "}
                                {catalog.models.length} available
                              </span>
                            )}
                            {catalog?.status === "error" && (
                              <span className="text-destructive">{catalog.error}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => runTest(row)}
                            disabled={!usable || test?.status === "running"}
                            className="btn btn-outline flex h-9 items-center gap-1 rounded-md px-3 text-xs disabled:opacity-50"
                          >
                            {test?.status === "running" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Zap className="h-3.5 w-3.5" />
                            )}
                            Test
                          </button>
                          <IconButton
                            label="Move up"
                            disabled={index === 0}
                            onClick={() => moveRow(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label="Move down"
                            disabled={index === rows.length - 1}
                            onClick={() => moveRow(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label="Remove"
                            onClick={() => setRows((prev) => prev.filter((r) => r.uid !== row.uid))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                      {test && test.status !== "running" && (
                        <div
                          className={cn(
                            "mt-2 flex gap-2 rounded-md px-3 py-2 text-xs lg:ml-7",
                            test.status === "ok"
                              ? "bg-emerald-600/10 text-emerald-900 dark:text-emerald-200"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {test.status === "ok" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0" />
                          )}
                          <span>
                            {test.status === "ok" ? (
                              <>
                                Answered in {(test.latency / 1000).toFixed(1)}s: &ldquo;{test.reply}
                                &rdquo;
                              </>
                            ) : (
                              test.error
                            )}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Tip: list two or three free models from different providers. Free tiers are
              rate-limited, and a backup keeps customers from seeing an apology instead of an
              answer.
            </p>
          </Panel>

          <Panel
            title="Providers"
            description="One key per provider. Keys are stored encrypted and never shown again. Changes apply after Save."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => {
                const keySetting = providerKeySetting(provider.id);
                const saved = provider.has_key && !removedSecrets.includes(keySetting);
                const status =
                  provider.self_hosted && !provider.requires_key
                    ? { label: "Self-hosted", tone: "info" as const }
                    : saved
                      ? { label: "Key saved", tone: "success" as const }
                      : { label: "No key", tone: "neutral" as const };
                return (
                  <div key={provider.id} className="flex flex-col gap-3 rounded-md border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {provider.label}
                          {(provider.free || !provider.self_hosted) && (
                            <StatusBadge
                              value="tier"
                              label={
                                provider.free
                                  ? provider.self_hosted
                                    ? "Free"
                                    : "Free tier"
                                  : "Paid"
                              }
                              tone={provider.free ? "success" : "neutral"}
                            />
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{provider.note}</p>
                      </div>
                      <StatusBadge value="status" label={status.label} tone={status.tone} />
                    </div>
                    {(provider.requires_key || provider.id === "custom") && (
                      <SecretInput
                        id={keySetting}
                        label="API key"
                        saved={saved}
                        value={secrets[keySetting] ?? ""}
                        onChange={(value) =>
                          setSecrets((prev) => ({ ...prev, [keySetting]: value }))
                        }
                        onRemove={
                          saved
                            ? () => setRemovedSecrets((prev) => [...prev, keySetting])
                            : undefined
                        }
                      />
                    )}
                    {provider.self_hosted &&
                      textField(
                        providerUrlSetting(provider.id),
                        "Base URL",
                        "Must be reachable from the backend server.",
                        "text",
                        provider.default_base_url || "https://…/v1",
                      )}
                    {provider.key_url && (
                      <a
                        href={provider.key_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {provider.self_hosted ? "Download" : "Get a key"}{" "}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Knowledge search"
            description="Optional. Off uses keyword search, which is free and works well for most catalogues."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="text-sm">
                <label htmlFor="embeddings-provider" className="mb-1.5 block text-xs font-semibold">
                  Semantic search provider
                </label>
                <select
                  id="embeddings-provider"
                  value={String(values["ai_support.embeddings.provider"] ?? "")}
                  onChange={(e) => {
                    setValue("ai_support.embeddings.provider", e.target.value);
                    setValue(
                      "ai_support.embeddings.model",
                      providerById[e.target.value]?.suggested_embedding_model ?? "",
                    );
                  }}
                  className={inputClass}
                >
                  <option value="">Off — keyword search</option>
                  {providers
                    .filter((p) => p.supports_embeddings)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Re-index knowledge sources after changing this.
                </p>
              </div>
              {values["ai_support.embeddings.provider"] &&
                textField(
                  "ai_support.embeddings.model",
                  "Embedding model",
                  "",
                  "text",
                  providerById[String(values["ai_support.embeddings.provider"])]
                    ?.suggested_embedding_model,
                )}
            </div>
          </Panel>
        </TabsContent>

        {/* ─── Channels ─── */}
        <TabsContent value="channels" className="space-y-6">
          <Panel title="Website chat">
            {switchRow(
              "ai_support.channel.website",
              "Show the chat widget",
              "Appears on every storefront page while the module is on.",
            )}
          </Panel>

          <Panel
            title="WhatsApp"
            actions={
              <StatusBadge
                value="wa"
                label={data.channels.whatsapp?.configured ? "Connected" : "Needs credentials"}
                tone={data.channels.whatsapp?.configured ? "success" : "warning"}
              />
            }
          >
            <div className="space-y-4">
              {switchRow(
                "ai_support.channel.whatsapp",
                "Reply on WhatsApp",
                "WhatsApp only allows free-form replies within 24 hours of the customer's last message.",
              )}
              <div>
                <p className="mb-1.5 text-xs font-semibold">
                  Callback URL (Meta → WhatsApp → Configuration)
                </p>
                {webhook("whatsapp")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {textField(
                  "ai_support.whatsapp.phone_number_id",
                  "Phone number ID",
                  "WhatsApp → API Setup. Other numbers are ignored.",
                )}
                {textField("ai_support.whatsapp.business_account_id", "Business account ID")}
              </div>
              {secretField(
                "ai_support.whatsapp.access_token",
                "Access token",
                "Permanent system-user token with whatsapp_business_messaging.",
              )}
            </div>
          </Panel>

          <Panel
            title="Instagram"
            actions={
              <StatusBadge
                value="ig"
                label={data.channels.instagram?.configured ? "Connected" : "Needs credentials"}
                tone={data.channels.instagram?.configured ? "success" : "warning"}
              />
            }
          >
            <div className="space-y-4">
              {switchRow("ai_support.channel.instagram", "Reply to Instagram DMs", "")}
              <div>
                <p className="mb-1.5 text-xs font-semibold">
                  Callback URL (Meta → Instagram → Webhooks)
                </p>
                {webhook("instagram")}
              </div>
              {secretField(
                "ai_support.instagram.access_token",
                "Access token",
                "Instagram account token with instagram_manage_messages.",
              )}
            </div>
          </Panel>

          <Panel
            title="Meta app"
            description="Shared by WhatsApp and Instagram. Subscribe the callback URLs to the messages field."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {secretField(
                "ai_support.meta.app_secret",
                "App secret",
                "App settings → Basic. Verifies every webhook.",
              )}
              {secretField(
                "ai_support.meta.verify_token",
                "Webhook verify token",
                "Any long random string; paste the same value in Meta.",
              )}
            </div>
          </Panel>
        </TabsContent>

        {/* ─── Widget ─── */}
        <TabsContent value="widget" className="space-y-6">
          <Panel title="Chat widget">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea
                id="ai_support.widget.greeting"
                label="Greeting"
                value={String(values["ai_support.widget.greeting"] ?? "")}
                onChange={(v) => setValue("ai_support.widget.greeting", v)}
              />
              <TextArea
                id="ai_support.widget.offline_message"
                label="Offline message"
                value={String(values["ai_support.widget.offline_message"] ?? "")}
                onChange={(v) => setValue("ai_support.widget.offline_message", v)}
              />
              <SelectField
                id="ai_support.widget.position"
                label="Position"
                value={String(values["ai_support.widget.position"] ?? "bottom-right")}
                onChange={(v) => setValue("ai_support.widget.position", v)}
                options={[
                  ["bottom-right", "Bottom right"],
                  ["bottom-left", "Bottom left"],
                ]}
              />
              <SelectField
                id="ai_support.widget.theme"
                label="Theme"
                value={String(values["ai_support.widget.theme"] ?? "light")}
                onChange={(v) => setValue("ai_support.widget.theme", v)}
                options={[
                  ["light", "Light"],
                  ["dark", "Dark"],
                ]}
              />
              {textField(
                "ai_support.widget.theme_color",
                "Accent colour",
                "Hex, e.g. #111111. Blank uses the site colour.",
                "text",
                "#111111",
              )}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Small components ───────────────────────────────────────────────────── */

function StatusCard({
  label,
  value,
  hint,
  ok,
}: {
  label: string;
  value: string;
  hint: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span
          className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-orange-500")}
          aria-hidden
        />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SecretInput({
  id,
  label,
  help,
  saved,
  value,
  onChange,
  onRemove,
}: {
  id: string;
  label: string;
  help?: string;
  saved: boolean;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type={visible ? "text" : "password"}
            autoComplete="off"
            placeholder={saved ? "Saved — type to replace" : "Not set"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClass, "pr-9")}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-2 text-muted-foreground hover:text-foreground"
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked; the URL is visible to copy by hand.
        }
      }}
      className="btn btn-outline h-8 shrink-0 rounded-md px-3 text-xs"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "h-auto py-2")}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
