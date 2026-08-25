import { Star } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/api/types";

export function ProductReviews({
  reviews,
  rating,
}: {
  reviews: Review[];
  rating: { average: number; count: number };
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="container-fluid border-t border-border py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl tracking-tight">Customer reviews</h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Stars value={Math.round(rating.average)} />
          {rating.average.toFixed(1)} out of 5 · {rating.count} review
          {rating.count === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <li key={review.id} className="border border-border p-6">
            <Stars value={review.rating} />
            {review.title && <h3 className="mt-3 font-display text-lg">{review.title}</h3>}
            {review.body && <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>}
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {review.author_name} · {formatDate(review.published_at)}
              {review.is_verified_purchase ? " · Verified purchase" : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden
          className={
            index < value ? "h-3.5 w-3.5 fill-gold text-gold" : "h-3.5 w-3.5 text-muted-foreground"
          }
        />
      ))}
    </span>
  );
}
