import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/format";
import { ActionButton, ConfirmAction } from "@/components/admin/actions";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  EmptyState,
  NoAccess,
  PageHeader,
  Pagination,
  StatusBadge,
  StatusTabs,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, ReviewRow } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reviews" };

/** Review moderation. Only approved reviews count towards a product's rating. */
export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "reviews.view")) return <NoAccess what="reviews" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<ReviewRow>>("reviews", query),
    getLookups(),
  ]);
  const counts = list.counts ?? {};
  const canUpdate = can(session, "reviews.update");

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approve what customers have written before it appears on the product page."
      />
      <StatusTabs
        path="/admin/reviews"
        query={query}
        tabs={[
          { value: "", label: "All", count: counts.all },
          ...lookups.enums.review_status.map((status) => ({
            ...status,
            count: counts[status.value],
          })),
        ]}
      />
      <FilterBar
        placeholder="Author, product or text"
        filters={[
          {
            type: "select",
            name: "rating",
            label: "Ratings",
            options: [5, 4, 3, 2, 1].map((rating) => ({
              value: String(rating),
              label: `${rating} star${rating === 1 ? "" : "s"}`,
            })),
          },
        ]}
      />
      {list.data.length === 0 ? (
        <EmptyState icon={Star} title="No reviews here" />
      ) : (
        <ul className="space-y-3">
          {list.data.map((review) => (
            <li key={review.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-gold" aria-label={`${review.rating} out of 5`}>
                      {"★".repeat(review.rating)}
                      <span className="text-muted-foreground/40">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                    <span className="font-semibold">{review.title ?? "No title"}</span>
                    <StatusBadge value={review.status} label={review.status_label} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.author_name}
                    {review.author_email && ` · ${review.author_email}`}
                    {review.is_verified_purchase && " · verified purchase"} ·{" "}
                    {formatDate(review.created_at)} ·{" "}
                    {review.product && (
                      <Link
                        href={`/admin/products/${review.product.id}`}
                        className="hover:underline"
                      >
                        {review.product.name}
                      </Link>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canUpdate && review.status !== "approved" && (
                    <ActionButton
                      endpoint={`reviews/${review.id}`}
                      method="PATCH"
                      body={{ status: "approved" }}
                      variant="primary"
                      success="Approved."
                    >
                      Approve
                    </ActionButton>
                  )}
                  {canUpdate && review.status !== "rejected" && (
                    <ActionButton
                      endpoint={`reviews/${review.id}`}
                      method="PATCH"
                      body={{ status: "rejected" }}
                      success="Rejected."
                    >
                      Reject
                    </ActionButton>
                  )}
                  {can(session, "reviews.delete") && (
                    <ConfirmAction
                      endpoint={`reviews/${review.id}`}
                      variant="ghost"
                      title="Delete this review?"
                      description="It cannot be recovered."
                      success="Review deleted."
                    >
                      Delete
                    </ConfirmAction>
                  )}
                </div>
              </div>
              {review.body && <p className="mt-3 whitespace-pre-line text-sm">{review.body}</p>}
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={list.meta} path="/admin/reviews" query={query} />
    </>
  );
}
