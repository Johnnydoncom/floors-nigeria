import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { ContentImage } from "@/components/site/ContentImage";
import { formatDate } from "@/lib/format";
import type { BlogPostCard } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * A journal article as a card. `feature` lays it out as the lead story.
 */
export function PostCard({
  post,
  feature = false,
  headingLevel = "h3",
}: {
  post: BlogPostCard;
  feature?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn("group block", feature && "grid items-center gap-8 lg:grid-cols-12")}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-muted",
          feature ? "aspect-[16/10] lg:col-span-7" : "aspect-[4/3]",
        )}
      >
        {post.image_url && (
          <ContentImage
            src={post.image_url}
            alt=""
            sizes={
              feature
                ? "(min-width: 1024px) 58vw, 100vw"
                : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            }
            priority={feature}
            className="transition-transform duration-[1.2s] group-hover:scale-105"
          />
        )}
      </div>

      <div className={cn(feature ? "lg:col-span-5" : "pt-4")}>
        <p className="eyebrow">
          {post.category.name}
          {feature && post.is_featured ? " · Featured" : ""}
        </p>
        <Heading
          className={cn(
            "mt-2 tracking-tight transition group-hover:text-gold text-balance",
            feature ? "font-display text-3xl md:text-5xl" : "font-display text-xl",
          )}
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <p
            className={cn(
              "mt-3 text-muted-foreground",
              feature ? "text-base md:text-lg" : "line-clamp-2 text-sm",
            )}
          >
            {post.excerpt}
          </p>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          {post.published_at && (
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          )}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> {post.reading_minutes} min read
          </span>
        </p>
        {feature && (
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">
            Read article <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </Link>
  );
}
