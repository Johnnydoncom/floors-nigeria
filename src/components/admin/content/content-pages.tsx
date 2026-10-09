import Link from "next/link";
import { Plus } from "lucide-react";
import { getCategories } from "@/lib/api/catalog";
import { FormDialog } from "@/components/admin/forms";
import { StatusBadge, StatusTabs } from "@/components/admin/ui";
import type { CountMap, Option } from "@/lib/admin/types";
import type { Category } from "@/lib/api/types";

/**
 * Pieces shared by the three CMS list and editor screens.
 */

export const CONTENT_TABS = (counts: CountMap) => [
  { value: "", label: "All", count: counts.all },
  { value: "live", label: "Live", count: counts.live },
  { value: "scheduled", label: "Scheduled", count: counts.scheduled },
  { value: "draft", label: "Drafts", count: counts.draft },
];

export function ContentTabs({
  path,
  query,
  counts,
}: {
  path: string;
  query: Parameters<typeof StatusTabs>[0]["query"];
  counts: CountMap;
}) {
  return <StatusTabs path={path} query={query} param="status" tabs={CONTENT_TABS(counts)} />;
}

/** A "New …" button: asks for a title, creates a draft and opens the editor. */
export function NewContentButton({
  endpoint,
  label,
  redirectTo,
}: {
  endpoint: string;
  label: string;
  redirectTo: string;
}) {
  return (
    <FormDialog
      title={label}
      description="Starts as a draft. You can write, add images and publish on the next screen."
      trigger={
        <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
          <Plus className="h-4 w-4" aria-hidden /> {label}
        </button>
      }
      fields={[{ name: "title", label: "Title", type: "text", required: true, wide: true }]}
      endpoint={endpoint}
      redirectTo={redirectTo}
      successMessage="Draft created."
      columns={1}
    />
  );
}

export function ContentStatus({
  record,
}: {
  record: { status: string; status_label: string; is_live: boolean };
}) {
  return (
    <StatusBadge
      value={record.is_live ? "live" : record.status === "published" ? "scheduled" : "draft"}
      label={record.status_label}
    />
  );
}

export function TitleCell({
  href,
  title,
  detail,
  image,
}: {
  href: string;
  title: string;
  detail: string;
  image: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-10 w-14 shrink-0 rounded bg-muted" />
      )}
      <div className="min-w-0">
        <Link href={href} className="font-medium hover:underline">
          {title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

/** Floor categories for "related floors", from the live catalogue tree. */
export async function floorOptions(): Promise<Option[]> {
  const categories = await getCategories().catch(() => [] as Category[]);
  const options: Option[] = [];
  const visit = (list: Category[], depth: number) => {
    for (const category of list) {
      options.push({ value: category.slug, label: `${depth ? "— " : ""}${category.name}` });
      visit(category.children ?? [], depth + 1);
    }
  };
  visit(categories, 0);
  return options;
}
