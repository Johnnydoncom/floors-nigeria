"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Settings, Save, Eye, EyeOff } from "lucide-react";

type SettingEntry = {
  key: string;
  value: unknown;
  group: string;
  is_public: boolean;
  is_secret?: boolean;
};

type FieldType = "text" | "number" | "password" | "select";

type Field = {
  key: string;
  label: string;
  description?: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/ai-support/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter (free models)" },
  { value: "groq", label: "Groq (free tier)" },
  { value: "gemini", label: "Google Gemini (free tier)" },
  { value: "ollama", label: "Ollama (self-hosted)" },
  { value: "lmstudio", label: "LM Studio (self-hosted)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "custom", label: "Custom OpenAI-compatible" },
];

const PROVIDER_OPTIONS = [{ value: "", label: "— None —" }, ...PROVIDERS];

const SWITCH_KEYS: Field[] = [
  {
    key: "ai_support.enabled",
    label: "Master switch",
    description: "Enable/disable the entire AI support module",
  },
  {
    key: "ai_support.channel.website",
    label: "Website chat",
    description: "Enable website chat widget",
  },
  {
    key: "ai_support.channel.instagram",
    label: "Instagram DMs",
    description: "Enable Instagram messaging",
  },
  {
    key: "ai_support.channel.whatsapp",
    label: "WhatsApp",
    description: "Enable WhatsApp messaging",
  },
  {
    key: "ai_support.feature.auto_reply",
    label: "AI auto-reply",
    description: "Let AI respond to customer messages",
  },
  {
    key: "ai_support.feature.copilot",
    label: "Agent copilot",
    description: "AI draft suggestions for agents",
  },
  {
    key: "ai_support.feature.human_support",
    label: "Human inbox",
    description: "Enable the agent inbox",
  },
  {
    key: "ai_support.feature.lead_capture",
    label: "Lead capture",
    description: "AI can create quote requests",
  },
  {
    key: "ai_support.feature.ingestion",
    label: "Knowledge ingestion",
    description: "Auto-index product catalogue",
  },
];

const ROUTING_FIELDS: Field[] = [
  {
    key: "ai_support.provider.primary",
    label: "Primary provider",
    type: "select",
    options: PROVIDER_OPTIONS,
  },
  {
    key: "ai_support.provider.model",
    label: "Primary model",
    description: "Model id sent to the primary provider",
  },
  {
    key: "ai_support.provider.fallback",
    label: "Fallback provider",
    type: "select",
    options: PROVIDER_OPTIONS,
  },
  { key: "ai_support.provider.fallback_model", label: "Fallback model" },
  {
    key: "ai_support.embeddings.provider",
    label: "Embedding provider",
    type: "select",
    options: PROVIDER_OPTIONS,
    description: "Leave empty for lexical-only retrieval (zero cost)",
  },
];

const LIMIT_FIELDS: Field[] = [
  {
    key: "ai_support.budget.daily_usd",
    label: "Daily AI budget (USD)",
    type: "number",
    description: "0 disables the cap. Free and self-hosted models cost $0.",
  },
  {
    key: "ai_support.rate_limit.messages_per_minute",
    label: "Messages per minute",
    type: "number",
  },
  {
    key: "ai_support.rate_limit.messages_per_session",
    label: "Messages per session",
    type: "number",
  },
  { key: "ai_support.retention.days", label: "Retention (days)", type: "number" },
  {
    key: "ai_support.calculator.waste_default",
    label: "Default waste allowance (%)",
    type: "number",
  },
];

const WIDGET_FIELDS: Field[] = [
  { key: "ai_support.widget.greeting", label: "Greeting" },
  { key: "ai_support.widget.offline_message", label: "Offline message" },
  {
    key: "ai_support.widget.position",
    label: "Position",
    type: "select",
    options: [
      { value: "bottom-right", label: "Bottom right" },
      { value: "bottom-left", label: "Bottom left" },
    ],
  },
  {
    key: "ai_support.widget.theme",
    label: "Theme",
    type: "select",
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
  },
  {
    key: "ai_support.widget.theme_color",
    label: "Theme colour",
    description: "Hex colour; leave blank to use the site's primary colour",
  },
];

const MASK = "••••••••";

type ChannelStatus = { webhook_url: string; configured: boolean };

/** Shared by both Meta channels: signs and verifies every webhook. */
const META_SECRETS: Field[] = [
  {
    key: "ai_support.meta.app_secret",
    label: "Meta app secret",
    description: "App settings → Basic. Verifies X-Hub-Signature-256 on every webhook.",
  },
  {
    key: "ai_support.meta.verify_token",
    label: "Webhook verify token",
    description: "Any long random string; paste the same value into Meta's webhook setup.",
  },
];

const WHATSAPP_SECRETS: Field[] = [
  {
    key: "ai_support.whatsapp.access_token",
    label: "Access token",
    description: "Permanent system-user token with whatsapp_business_messaging.",
  },
];

const WHATSAPP_FIELDS: Field[] = [
  {
    key: "ai_support.whatsapp.phone_number_id",
    label: "Phone number ID",
    description: "WhatsApp → API Setup. Messages to other numbers are ignored.",
  },
  { key: "ai_support.whatsapp.business_account_id", label: "WhatsApp Business Account ID" },
];

const INSTAGRAM_SECRETS: Field[] = [
  {
    key: "ai_support.instagram.access_token",
    label: "Access token",
    description: "Instagram account token with instagram_manage_messages.",
  },
];

const PROVIDER_FIELDS: Record<string, Field[]> = Object.fromEntries(
  PROVIDERS.map((provider) => [
    provider.value,
    [
      { key: `ai_support.providers.${provider.value}.base_url`, label: "Base URL" },
      { key: `ai_support.providers.${provider.value}.model`, label: "Model" },
      { key: `ai_support.providers.${provider.value}.embedding_model`, label: "Embedding model" },
    ],
  ]),
);

const EMBEDDING_FLAGS = PROVIDERS.map((provider) => ({
  key: `ai_support.providers.${provider.value}.supports_embeddings`,
  label: `${provider.label} supports embeddings`,
}));

function toInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

export default function SupportSettingsPage() {
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingMap = useMemo(() => {
    const map: Record<string, SettingEntry> = {};
    for (const entry of settings) map[entry.key] = entry;
    return map;
  }, [settings]);

  const loadSettings = useCallback(async () => {
    const result = await adminFetch<{
      settings: SettingEntry[];
      channels?: Record<string, ChannelStatus>;
    }>("settings");
    setSettings(result.settings);
    setChannels(result.channels ?? {});

    const switchState: Record<string, boolean> = {};
    for (const field of [...SWITCH_KEYS, ...EMBEDDING_FLAGS]) {
      const entry = result.settings.find((item) => item.key === field.key);
      switchState[field.key] = toBoolean(entry?.value);
    }
    setSwitches(switchState);

    const valueState: Record<string, string> = {};
    for (const field of [
      ...ROUTING_FIELDS,
      ...LIMIT_FIELDS,
      ...WIDGET_FIELDS,
      ...WHATSAPP_FIELDS,
      ...Object.values(PROVIDER_FIELDS).flat(),
    ]) {
      const entry = result.settings.find((item) => item.key === field.key);
      valueState[field.key] = toInputValue(entry?.value);
    }
    setValues(valueState);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API; state is set after the fetch resolves
    loadSettings().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    });
  }, [loadSettings]);

  const handleSave = () => {
    startTransition(async () => {
      setError(null);

      const updates: { key: string; value: unknown }[] = [];

      for (const [key, value] of Object.entries(switches)) {
        updates.push({ key, value });
      }

      for (const [key, value] of Object.entries(values)) {
        updates.push({ key, value });
      }

      for (const [key, value] of Object.entries(secrets)) {
        if (value) updates.push({ key, value });
      }

      try {
        await adminFetch("settings", {
          method: "PATCH",
          body: JSON.stringify({ settings: updates }),
        });

        setSaved(true);
        setSecrets({});
        setTimeout(() => setSaved(false), 3000);
        await loadSettings();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save settings.");
      }
    });
  };

  const renderField = (field: Field) => (
    <label
      key={field.key}
      className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{field.label}</p>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      </div>
      {field.type === "select" ? (
        <select
          value={values[field.key] ?? ""}
          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
          className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary sm:w-72"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={values[field.key] ?? ""}
          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
          className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary sm:w-72"
        />
      )}
    </label>
  );

  const renderSecret = (field: Field) => {
    const hasValue = settingMap[field.key]?.value === MASK;

    return (
      <div
        key={field.key}
        className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">{field.label}</p>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-72">
          <input
            type={showSecrets[field.key] ? "text" : "password"}
            autoComplete="off"
            placeholder={hasValue ? `${MASK}  (already set)` : "Not set"}
            value={secrets[field.key] ?? ""}
            onChange={(e) => setSecrets((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            aria-label={field.label}
          />
          <button
            type="button"
            onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Toggle ${field.label} visibility`}
          >
            {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  };

  const copyWebhook = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked; the URL is still visible to copy by hand.
    }
  };

  const renderChannelHeader = (name: string, channelKey: string) => {
    const status = channels[channelKey];

    return (
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {name}
            <span
              className={
                status?.configured
                  ? "rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"
                  : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
              }
            >
              {status?.configured ? "Connected" : "Needs credentials"}
            </span>
          </p>
          {status?.webhook_url && (
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              Callback URL: {status.webhook_url}
            </p>
          )}
        </div>
        {status?.webhook_url && (
          <button
            type="button"
            onClick={() => copyWebhook(status.webhook_url)}
            className="btn btn-outline h-8 shrink-0 rounded-md px-3 text-xs"
          >
            {copied === status.webhook_url ? "Copied" : "Copy URL"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" /> AI Support Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control which features are active. All switches default OFF. Free and self-hosted
            providers never consume the budget.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary h-9 rounded-md px-4 text-sm flex items-center gap-2"
        >
          <Save className="h-4 w-4" /> {saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Switches */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Feature switches</h2>
        </div>
        <div className="divide-y">
          {SWITCH_KEYS.map((field) => (
            <label
              key={field.key}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{field.label}</p>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
              <input
                type="checkbox"
                checked={switches[field.key] ?? false}
                onChange={(e) =>
                  setSwitches((prev) => ({ ...prev, [field.key]: e.target.checked }))
                }
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Messaging channels */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Channels — WhatsApp &amp; Instagram</h2>
          <p className="text-xs text-muted-foreground">
            Both use one Meta app. Subscribe the callback URL to the <code>messages</code> field in
            Meta&apos;s webhook settings, then turn the channel on under Feature switches. Secrets
            are stored encrypted and never shown again.
          </p>
        </div>
        <div className="divide-y">
          <div className="bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Meta app
          </div>
          {META_SECRETS.map(renderSecret)}
        </div>
        <div className="divide-y border-t">
          {renderChannelHeader("WhatsApp AI agent", "whatsapp")}
          {WHATSAPP_FIELDS.map(renderField)}
          {WHATSAPP_SECRETS.map(renderSecret)}
          <p className="px-4 py-3 text-xs text-muted-foreground">
            WhatsApp only accepts free-form replies within 24 hours of the customer&apos;s last
            message. Later replies are refused and marked failed in the inbox.
          </p>
        </div>
        <div className="divide-y border-t">
          {renderChannelHeader("Instagram DMs", "instagram")}
          {INSTAGRAM_SECRETS.map(renderSecret)}
        </div>
      </div>

      {/* Provider routing */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Provider routing</h2>
          <p className="text-xs text-muted-foreground">
            Defaults ship with a free OpenRouter model and a local Ollama fallback.
          </p>
        </div>
        <div className="divide-y">{ROUTING_FIELDS.map(renderField)}</div>
      </div>

      {/* Provider credentials */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Provider credentials &amp; models</h2>
          <p className="text-xs text-muted-foreground">
            Stored encrypted where sensitive. Local providers can leave the key blank.
          </p>
        </div>
        <div className="divide-y">
          {PROVIDERS.map((provider) => {
            const secretKey = `ai_support.providers.${provider.value}.api_key`;
            const existing = settingMap[secretKey];
            const hasValue = existing?.value === "••••••••";

            return (
              <details key={provider.value} className="group">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50">
                  <span>{provider.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {hasValue ? "Key set" : "Key not set"}
                  </span>
                </summary>
                <div className="divide-y border-t">
                  {PROVIDER_FIELDS[provider.value].map(renderField)}

                  <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">API key</p>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type={showSecrets[secretKey] ? "text" : "password"}
                          placeholder={hasValue ? "••••••••  (already set)" : "Enter key…"}
                          value={secrets[secretKey] ?? ""}
                          onChange={(e) =>
                            setSecrets((prev) => ({ ...prev, [secretKey]: e.target.value }))
                          }
                          className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets((prev) => ({ ...prev, [secretKey]: !prev[secretKey] }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Toggle key visibility"
                        >
                          {showSecrets[secretKey] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {hasValue && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        Set
                      </span>
                    )}
                  </div>

                  <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50">
                    <span className="text-sm font-medium">Supports embeddings</span>
                    <input
                      type="checkbox"
                      checked={
                        switches[`ai_support.providers.${provider.value}.supports_embeddings`] ??
                        false
                      }
                      onChange={(e) =>
                        setSwitches((prev) => ({
                          ...prev,
                          [`ai_support.providers.${provider.value}.supports_embeddings`]:
                            e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* Limits */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Limits &amp; retention</h2>
          <p className="text-xs text-muted-foreground">
            Run <code>php artisan ai-support:cleanup</code> on a schedule to apply retention.
          </p>
        </div>
        <div className="divide-y">{LIMIT_FIELDS.map(renderField)}</div>
      </div>

      {/* Widget */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Widget appearance</h2>
        </div>
        <div className="divide-y">{WIDGET_FIELDS.map(renderField)}</div>
      </div>
    </div>
  );
}
