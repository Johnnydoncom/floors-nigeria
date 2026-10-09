"use client";

import { useId, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Markdown } from "@/components/site/Markdown";
import { ConfirmAction } from "@/components/admin/actions";
import { FieldShell, inputClass } from "@/components/admin/forms";
import { StatusBadge } from "@/components/admin/ui";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import type { AdminPage, AdminPortfolio, AdminPost, Option } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { ContentMedia, type ContentMediaType } from "./ContentMedia";

export type ContentKind = "pages" | "posts" | "portfolio";

type AnyRecord = AdminPage | AdminPost | AdminPortfolio;

const MEDIA_TYPE: Record<ContentKind, ContentMediaType> = {
  pages: "page",
  posts: "post",
  portfolio: "portfolio",
};

const LIST_PATH: Record<ContentKind, string> = {
  pages: "/admin/pages",
  posts: "/admin/posts",
  portfolio: "/admin/portfolio",
};

type Values = Record<string, unknown>;

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValues(kind: ContentKind, record: AnyRecord): Values {
  const common = {
    title: record.title,
    slug: record.slug,
    body: record.body ?? "",
    cover_image: record.cover_image ?? "",
    status: record.status,
    published_at: toLocalInput(record.published_at),
    seo_title: record.seo.title ?? "",
    seo_description: record.seo.description ?? "",
    seo_canonical: record.seo.canonical ?? "",
    seo_noindex: record.seo.noindex,
  };

  if (kind === "pages") {
    const page = record as AdminPage;
    return {
      ...common,
      eyebrow: page.eyebrow ?? "",
      excerpt: page.excerpt ?? "",
      show_in_footer: page.show_in_footer,
      sort_order: String(page.sort_order),
      faqs: page.faqs ?? [],
    };
  }

  if (kind === "posts") {
    const post = record as AdminPost;
    return {
      ...common,
      category: post.category,
      excerpt: post.excerpt ?? "",
      author_name: post.author_name ?? "",
      tags: post.tags.join(", "),
      floors: post.floors,
      is_featured: post.is_featured,
    };
  }

  const project = record as AdminPortfolio;
  return {
    ...common,
    client_name: project.client_name ?? "",
    sector: project.sector,
    location: project.location ?? "",
    city: project.city ?? "",
    state: project.state ?? "",
    area_sqm: project.area_sqm === null ? "" : String(project.area_sqm),
    completed_on: project.completed_on ?? "",
    summary: project.summary ?? "",
    floors: project.floors,
    is_featured: project.is_featured,
    sort_order: String(project.sort_order),
  };
}

const blank = (value: unknown) => (value === "" || value === undefined ? null : value);

function payload(kind: ContentKind, values: Values): Values {
  const common = {
    title: values.title,
    slug: blank(values.slug),
    body: blank(values.body),
    cover_image: blank(values.cover_image),
    status: values.status,
    published_at: values.published_at ? new Date(String(values.published_at)).toISOString() : null,
    seo: {
      title: blank(values.seo_title),
      description: blank(values.seo_description),
      canonical: blank(values.seo_canonical),
      noindex: Boolean(values.seo_noindex),
    },
  };

  if (kind === "pages") {
    return {
      ...common,
      eyebrow: blank(values.eyebrow),
      excerpt: blank(values.excerpt),
      show_in_footer: Boolean(values.show_in_footer),
      sort_order: Number(values.sort_order) || 0,
      faqs: (values.faqs as { question: string; answer: string }[]).filter(
        (faq) => faq.question.trim() || faq.answer.trim(),
      ),
    };
  }

  if (kind === "posts") {
    return {
      ...common,
      category: blank(values.category),
      excerpt: blank(values.excerpt),
      author_name: blank(values.author_name),
      tags: String(values.tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      floors: values.floors,
      is_featured: Boolean(values.is_featured),
    };
  }

  return {
    ...common,
    client_name: blank(values.client_name),
    sector: values.sector,
    location: blank(values.location),
    city: blank(values.city),
    state: blank(values.state),
    area_sqm: values.area_sqm === "" ? null : Number(values.area_sqm),
    completed_on: blank(values.completed_on),
    summary: blank(values.summary),
    floors: values.floors,
    is_featured: Boolean(values.is_featured),
    sort_order: Number(values.sort_order) || 0,
  };
}

/**
 * The editor for a CMS page, journal article or portfolio project: copy in
 * Markdown with a live preview, publication, images and SEO. Saves the whole
 * record in one request; the storefront cache is purged by the admin proxy.
 */
export function ContentEditor({
  kind,
  record,
  editable,
  canDelete,
  floorOptions = [],
  sectors = [],
  categories = [],
  states = [],
}: {
  kind: ContentKind;
  record: AnyRecord;
  editable: boolean;
  canDelete: boolean;
  floorOptions?: Option[];
  sectors?: string[];
  categories?: string[];
  states?: string[];
}) {
  const [values, setValues] = useState<Values>(() => initialValues(kind, record));
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  const { run, pending, errors } = useAdminMutation();
  const formId = useId();
  const mediaType = MEDIA_TYPE[kind];
  const media = record.media ?? {};

  const set = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
  };
  const error = (name: string) => errors[name]?.[0];

  async function save(event?: React.FormEvent, overrides: Values = {}) {
    event?.preventDefault();
    const next = { ...values, ...overrides };
    const result = await run(
      () => adminRequest("PATCH", `${kind}/${record.id}`, payload(kind, next)),
      { success: overrides.status === "published" ? "Published." : "Saved." },
    );
    if (result) {
      setValues(next);
      setDirty(false);
    }
  }

  const text = (
    name: string,
    label: string,
    props: { help?: string; placeholder?: string; type?: string } = {},
  ) => (
    <FieldShell id={`${formId}-${name}`} label={label} error={error(name)} help={props.help}>
      <input
        id={`${formId}-${name}`}
        type={props.type ?? "text"}
        value={String(values[name] ?? "")}
        placeholder={props.placeholder}
        onChange={(event) => set(name, event.target.value)}
        aria-invalid={error(name) ? true : undefined}
        className={inputClass}
      />
    </FieldShell>
  );

  const area = (name: string, label: string, rows = 3, help?: string) => (
    <FieldShell
      id={`${formId}-${name}`}
      label={label}
      error={error(name)}
      help={help}
      className="sm:col-span-2"
    >
      <textarea
        id={`${formId}-${name}`}
        rows={rows}
        value={String(values[name] ?? "")}
        onChange={(event) => set(name, event.target.value)}
        aria-invalid={error(name) ? true : undefined}
        className={cn(inputClass, "h-auto py-2")}
      />
    </FieldShell>
  );

  const toggle = (name: string, label: string, help?: string) => (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
      <div>
        <label htmlFor={`${formId}-${name}`} className="text-sm font-medium">
          {label}
        </label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <Switch
        id={`${formId}-${name}`}
        checked={Boolean(values[name])}
        onCheckedChange={(checked) => set(name, checked)}
      />
    </div>
  );

  const floors = (
    <FieldShell
      id={`${formId}-floors`}
      label="Floors to link to"
      help="Shown as category tiles under the copy, for internal linking."
      error={error("floors")}
      className="sm:col-span-2"
    >
      <div
        id={`${formId}-floors`}
        className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2"
      >
        {floorOptions.map((option) => {
          const selected = (values.floors as string[]).includes(option.value);
          return (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) =>
                  set(
                    "floors",
                    event.target.checked
                      ? [...(values.floors as string[]), option.value]
                      : (values.floors as string[]).filter((slug) => slug !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </FieldShell>
  );

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-3">
      <fieldset disabled={!editable || pending} className="min-w-0 space-y-6 xl:col-span-2">
        <Card title="Content">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{text("title", "Title")}</div>
            {text("slug", "Address", {
              help: `${record.public_url.replace(/[^/]+$/, "")}… — blank to derive it from the title.`,
            })}

            {kind === "pages" && (
              <>
                {text("eyebrow", "Label above the title", {
                  placeholder: "Help, Legal, Services…",
                })}
                {area(
                  "excerpt",
                  "Introduction",
                  2,
                  "Shown under the title and as the search snippet when no SEO description is set.",
                )}
              </>
            )}

            {kind === "posts" && (
              <>
                <FieldShell id={`${formId}-category`} label="Category" error={error("category")}>
                  <input
                    id={`${formId}-category`}
                    list={`${formId}-categories`}
                    value={String(values.category ?? "")}
                    onChange={(event) => set("category", event.target.value)}
                    className={inputClass}
                  />
                  <datalist id={`${formId}-categories`}>
                    {[
                      ...new Set([
                        "Buying guides",
                        "Care & maintenance",
                        "Design ideas",
                        "Projects",
                        ...categories,
                      ]),
                    ].map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </FieldShell>
                {text("author_name", "Byline", { placeholder: "Floor Nigeria" })}
                {text("tags", "Tags", { help: "Comma separated." })}
                {area(
                  "excerpt",
                  "Summary",
                  2,
                  "One or two sentences for cards and search results.",
                )}
              </>
            )}

            {kind === "portfolio" && (
              <>
                <FieldShell id={`${formId}-sector`} label="Sector" error={error("sector")}>
                  <select
                    id={`${formId}-sector`}
                    value={String(values.sector ?? "")}
                    onChange={(event) => set("sector", event.target.value)}
                    className={inputClass}
                  >
                    {[...new Set([String(values.sector), ...sectors])].map((sector) => (
                      <option key={sector}>{sector}</option>
                    ))}
                  </select>
                </FieldShell>
                {text("client_name", "Client (only with their consent)")}
                {text("location", "Area / neighbourhood", { placeholder: "Victoria Island" })}
                {text("city", "City")}
                <FieldShell id={`${formId}-state`} label="State" error={error("state")}>
                  <select
                    id={`${formId}-state`}
                    value={String(values.state ?? "")}
                    onChange={(event) => set("state", event.target.value)}
                    className={inputClass}
                  >
                    <option value="">— None —</option>
                    {states.map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </select>
                </FieldShell>
                {text("area_sqm", "Floor area (m²)", { type: "number" })}
                {text("completed_on", "Completed", { type: "date" })}
                {area("summary", "Summary", 2, "Blank builds one from sector, area and location.")}
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">
                {kind === "portfolio" ? "Case study" : "Body"}{" "}
                <span className="font-normal text-muted-foreground">
                  — Markdown: ## heading, **bold**, *italic*, - list, [link](/path),
                  ![alt](/image.jpg)
                </span>
              </span>
              <div
                className="inline-flex rounded-md border border-border p-0.5 text-xs"
                role="tablist"
              >
                {(["write", "preview"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={tab === option}
                    onClick={() => setTab(option)}
                    className={cn(
                      "rounded px-2.5 py-1 capitalize",
                      tab === option
                        ? "bg-charcoal-dark text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            {tab === "write" ? (
              <textarea
                aria-label="Body"
                rows={22}
                value={String(values.body ?? "")}
                onChange={(event) => set("body", event.target.value)}
                className={cn(inputClass, "mt-2 h-auto py-3 font-mono text-[13px] leading-relaxed")}
              />
            ) : (
              <div className="mt-2 min-h-64 rounded-md border border-border bg-background p-5">
                {String(values.body ?? "").trim() ? (
                  <Markdown source={String(values.body)} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            )}
            {error("body") && <p className="mt-1 text-xs text-destructive">{error("body")}</p>}
          </div>
        </Card>

        {kind === "pages" && (
          <Card
            title="Questions & answers"
            description="Shown as an expandable list under the body, and marked up for FAQ results in search."
          >
            <FaqEditor
              faqs={values.faqs as { question: string; answer: string }[]}
              onChange={(faqs) => set("faqs", faqs)}
              errors={errors}
            />
          </Card>
        )}

        {kind !== "pages" && floorOptions.length > 0 && (
          <Card title="Related floors">{floors}</Card>
        )}

        <Card title="Search & sharing" description="Leave blank to use the title and introduction.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{text("seo_title", "Search title")}</div>
            {area("seo_description", "Meta description", 2)}
            {text("seo_canonical", "Canonical URL", { placeholder: "https://", type: "url" })}
            <div className="self-end">{toggle("seo_noindex", "Hide from search engines")}</div>
          </div>
          {(error("seo.title") || error("seo.description") || error("seo.canonical")) && (
            <p className="mt-2 text-xs text-destructive">
              {error("seo.title") ?? error("seo.description") ?? error("seo.canonical")}
            </p>
          )}
        </Card>
      </fieldset>

      <div className="space-y-6">
        <Card title="Publish">
          <div className="flex items-center justify-between gap-2 text-sm">
            <StatusBadge
              value={
                record.is_live ? "live" : record.status === "published" ? "scheduled" : "draft"
              }
              label={record.status_label}
            />
            <a
              href={record.public_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {record.is_live ? "View on site" : "Preview link"}{" "}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
          <fieldset disabled={!editable || pending} className="mt-4 space-y-4">
            <FieldShell id={`${formId}-status`} label="Status" error={error("status")}>
              <select
                id={`${formId}-status`}
                value={String(values.status)}
                onChange={(event) => set("status", event.target.value)}
                className={inputClass}
              >
                <option value="draft">Draft — not on the website</option>
                <option value="published">Published</option>
              </select>
            </FieldShell>
            <FieldShell
              id={`${formId}-published_at`}
              label="Publish date"
              help="A future date schedules it. Blank publishes now."
              error={error("published_at")}
            >
              <input
                id={`${formId}-published_at`}
                type="datetime-local"
                value={String(values.published_at ?? "")}
                onChange={(event) => set("published_at", event.target.value)}
                className={inputClass}
              />
            </FieldShell>
            {kind === "pages" && toggle("show_in_footer", "Link in the footer")}
            {kind !== "pages" &&
              toggle(
                "is_featured",
                "Featured",
                kind === "posts" ? "Leads the journal." : "Shown on the homepage.",
              )}
            {kind !== "posts" && text("sort_order", "Order", { type: "number" })}
          </fieldset>
          {editable && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary h-9 flex-1 rounded-md px-4 text-xs"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Save{dirty ? " changes" : ""}
              </button>
              {record.status === "draft" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(undefined, { status: "published" })}
                  className="btn btn-gold h-9 rounded-md px-4 text-xs"
                >
                  Publish
                </button>
              )}
            </div>
          )}
        </Card>

        <Card title="Cover image">
          <ContentMedia
            type={mediaType}
            id={record.id}
            collection="hero"
            items={media.hero ?? []}
            multiple={false}
            editable={editable}
            emptyLabel={record.cover_image ? `Using ${record.cover_image}` : "No cover yet."}
          />
          <fieldset disabled={!editable || pending} className="mt-4">
            {text("cover_image", "Or an image path", {
              placeholder: "/images/hero-floor.jpg",
              help: "Used when no image is uploaded.",
            })}
          </fieldset>
        </Card>

        <Card title={kind === "portfolio" ? "Project gallery" : "Gallery"}>
          <ContentMedia
            type={mediaType}
            id={record.id}
            collection="gallery"
            items={media.gallery ?? []}
            multiple
            editable={editable}
            emptyLabel="No photos yet."
          />
        </Card>

        {kind === "portfolio" && (
          <Card title="Before & after" description="Pairs are shown side by side, in upload order.">
            <p className="mb-2 text-xs font-semibold">Before</p>
            <ContentMedia
              type={mediaType}
              id={record.id}
              collection="before"
              items={media.before ?? []}
              multiple
              editable={editable}
              emptyLabel="No before photos."
            />
            <p className="mb-2 mt-4 text-xs font-semibold">After</p>
            <ContentMedia
              type={mediaType}
              id={record.id}
              collection="after"
              items={media.after ?? []}
              multiple
              editable={editable}
              emptyLabel="No after photos."
            />
          </Card>
        )}

        {canDelete && (
          <ConfirmAction
            endpoint={`${kind}/${record.id}`}
            title={`Delete “${record.title}”?`}
            description="It disappears from the website straight away. This cannot be undone."
            success="Deleted."
            redirectTo={LIST_PATH[kind]}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </ConfirmAction>
        )}
      </div>
    </form>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FaqEditor({
  faqs,
  onChange,
  errors,
}: {
  faqs: { question: string; answer: string }[];
  onChange: (faqs: { question: string; answer: string }[]) => void;
  errors: Record<string, string[]>;
}) {
  const update = (index: number, key: "question" | "answer", value: string) =>
    onChange(faqs.map((faq, position) => (position === index ? { ...faq, [key]: value } : faq)));

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="rounded-md border border-border p-3">
          <div className="flex items-start gap-2">
            <input
              aria-label={`Question ${index + 1}`}
              placeholder="Question"
              value={faq.question}
              onChange={(event) => update(index, "question", event.target.value)}
              className={cn(inputClass, "font-medium")}
            />
            <button
              type="button"
              aria-label={`Remove question ${index + 1}`}
              onClick={() => onChange(faqs.filter((_, position) => position !== index))}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-input text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <textarea
            aria-label={`Answer ${index + 1}`}
            placeholder="Answer"
            rows={3}
            value={faq.answer}
            onChange={(event) => update(index, "answer", event.target.value)}
            className={cn(inputClass, "mt-2 h-auto py-2")}
          />
          {(errors[`faqs.${index}.question`] || errors[`faqs.${index}.answer`]) && (
            <p className="mt-1 text-xs text-destructive">
              {errors[`faqs.${index}.question`]?.[0] ?? errors[`faqs.${index}.answer`]?.[0]}
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...faqs, { question: "", answer: "" }])}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add a question
      </button>
    </div>
  );
}
