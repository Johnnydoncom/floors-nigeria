import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, XCircle } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  DataTable,
  EmptyState,
  NoAccess,
  PageHeader,
  Pagination,
  StatusBadge,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { KnowledgeSource, PaginatedResponse } from "@/lib/ai-support/types";

export const metadata: Metadata = { title: "AI Support — Knowledge" };

const INGESTION_ICONS: Record<string, typeof CheckCircle> = {
  indexed: CheckCircle,
  pending: Clock,
  processing: Clock,
  failed: XCircle,
};

export default async function KnowledgePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "ai_support.knowledge.view")) return <NoAccess what="knowledge base" />;

  const query = await searchParams;
  const list = await adminGet<PaginatedResponse<KnowledgeSource>>("ai-support/knowledge", query);

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Manage knowledge sources that power the AI assistant's responses."
      />

      <FilterBar
        placeholder="Search by title"
        filters={[
          {
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "pending_review", label: "Pending review" },
              { value: "approved", label: "Approved" },
              { value: "archived", label: "Archived" },
            ],
          },
          {
            type: "select",
            name: "type",
            label: "Type",
            options: [
              { value: "product_catalogue", label: "Product catalogue" },
              { value: "faq", label: "FAQ" },
              { value: "policy", label: "Policy" },
              { value: "installation_guide", label: "Installation guide" },
              { value: "custom_upload", label: "Custom upload" },
            ],
          },
        ]}
      />

      <DataTable
        caption="Knowledge sources"
        rows={list.data}
        empty={
          <EmptyState icon={BookOpen} title="No knowledge sources">
            Add FAQs, policies, and product data to power the AI assistant.
          </EmptyState>
        }
        columns={[
          {
            key: "title",
            header: "Title",
            cell: (s) => (
              <Link
                href={`/admin/support-knowledge/${s.id}`}
                className="font-medium hover:underline"
              >
                {s.title}
              </Link>
            ),
          },
          {
            key: "type",
            header: "Type",
            className: "max-md:hidden capitalize",
            cell: (s) => s.type.replace(/_/g, " "),
          },
          {
            key: "status",
            header: "Status",
            cell: (s) => <StatusBadge value={s.status} label={s.status.replace(/_/g, " ")} />,
          },
          {
            key: "ingestion",
            header: "Indexed",
            cell: (s) => {
              const Icon = INGESTION_ICONS[s.ingestion_status] ?? Clock;
              return (
                <span className="flex items-center gap-1 text-xs capitalize">
                  <Icon className="h-3.5 w-3.5" /> {s.ingestion_status}
                </span>
              );
            },
          },
          {
            key: "owner",
            header: "Owner",
            className: "max-lg:hidden",
            cell: (s) => s.owner?.name ?? "—",
          },
          {
            key: "date",
            header: "Created",
            className: "whitespace-nowrap max-sm:hidden",
            cell: (s) => formatDate(s.created_at),
          },
        ]}
      />
      <Pagination meta={list} path="/admin/support-knowledge" query={query} />
    </>
  );
}
