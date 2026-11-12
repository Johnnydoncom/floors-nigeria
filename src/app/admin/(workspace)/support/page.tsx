import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageCircle } from "lucide-react";
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
import type { Conversation, PaginatedResponse } from "@/lib/ai-support/types";

export const metadata: Metadata = { title: "AI Support — Inbox" };

export default async function SupportPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "ai_support.conversations.view")) return <NoAccess what="support inbox" />;

  const query = await searchParams;
  const list = await adminGet<PaginatedResponse<Conversation>>("ai-support/conversations", query);

  return (
    <>
      <PageHeader
        title="AI Support Inbox"
        description="Active conversations across website chat, Instagram, and WhatsApp."
      />

      <FilterBar
        placeholder="Search by conversation ID"
        filters={[
          {
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "waiting", label: "Waiting" },
              { value: "assigned", label: "Assigned" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ],
          },
          {
            type: "select",
            name: "channel",
            label: "Channel",
            options: [
              { value: "website", label: "Website" },
              { value: "instagram", label: "Instagram" },
              { value: "whatsapp", label: "WhatsApp" },
            ],
          },
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />

      <DataTable
        caption="Conversations"
        rows={list.data}
        empty={
          <EmptyState icon={Inbox} title="No conversations">
            Conversations from website chat, WhatsApp and Instagram will appear here.
          </EmptyState>
        }
        columns={[
          {
            key: "ulid",
            header: "Conversation",
            cell: (c) => (
              <div className="min-w-0">
                <Link href={`/admin/support/${c.id}`} className="font-medium hover:underline">
                  {c.ulid.slice(0, 10)}…
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {c.user?.name ?? c.contact_name ?? c.contact_phone ?? "Visitor"} ·{" "}
                  {c.message_count} messages
                </p>
              </div>
            ),
          },
          {
            key: "channel",
            header: "Channel",
            cell: (c) => (
              <span className="inline-flex items-center gap-1.5 text-xs capitalize">
                <MessageCircle className="h-3 w-3" /> {c.channel}
              </span>
            ),
          },
          {
            key: "agent",
            header: "Agent",
            className: "max-md:hidden",
            cell: (c) =>
              (c.assigned_agent ?? c.assignedAgent)?.name ?? (
                <span className="text-muted-foreground">
                  {c.ai_mode === "active" ? "AI" : "Unassigned"}
                </span>
              ),
          },
          {
            key: "last_message",
            header: "Last message",
            className: "whitespace-nowrap max-sm:hidden",
            cell: (c) => (c.last_message_at ? formatDate(c.last_message_at) : "—"),
          },
          {
            key: "status",
            header: "Status",
            cell: (c) => <StatusBadge value={c.status} label={c.status} />,
          },
        ]}
      />
      <Pagination meta={list} path="/admin/support" query={query} />
    </>
  );
}
