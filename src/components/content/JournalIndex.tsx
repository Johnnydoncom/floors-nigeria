import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { PostCard } from "./PostCard";
import type { PostList } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The journal listing, shared by `/blog` and each category page: category
 * filter, lead story, then the rest as a grid.
 */
export function JournalIndex({
  list,
  activeCategory,
  title,
  intro,
}: {
  list: PostList;
  activeCategory?: string;
  title: string;
  intro: string;
}) {
  const posts = list.data;
  const lead = activeCategory ? undefined : (posts.find((post) => post.is_featured) ?? posts[0]);
  const rest = posts.filter((post) => post !== lead);

  return (
    <>
      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <Reveal>
          <p className="eyebrow">Journal</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl tracking-tight text-balance md:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{intro}</p>
        </Reveal>

        {list.categories.length > 0 && (
          <nav aria-label="Journal categories" className="mt-10 flex flex-wrap gap-2">
            <CategoryChip href="/blog" active={!activeCategory} label="All" />
            {list.categories.map((category) => (
              <CategoryChip
                key={category.slug}
                href={`/blog/category/${category.slug}`}
                active={activeCategory === category.slug}
                label={category.name}
                count={category.count}
              />
            ))}
          </nav>
        )}
      </section>

      <section className="container-fluid pb-24 pt-12">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center md:p-16">
            <BookOpen className="mx-auto h-8 w-8 text-gold" aria-hidden />
            <p className="mt-4 font-display text-xl">New articles are on their way.</p>
            <p className="mt-2 text-muted-foreground">
              In the meantime, our consultants are happy to answer any flooring question.
            </p>
            <Link href="/contact" className="btn btn-primary mt-6">
              Ask a specialist <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            {lead && (
              <Reveal>
                <PostCard post={lead} feature headingLevel="h2" />
              </Reveal>
            )}

            {rest.length > 0 && (
              <div
                className={cn(
                  "grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3",
                  lead && "mt-16 border-t border-border pt-16",
                )}
              >
                {rest.map((post, index) => (
                  <Reveal key={post.id} delay={(index % 3) * 0.05}>
                    <PostCard post={post} headingLevel={lead ? "h3" : "h2"} />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function CategoryChip({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition",
        active
          ? "border-charcoal-dark bg-charcoal-dark text-primary-foreground"
          : "border-border hover:border-foreground/40",
      )}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-xs opacity-60">{count}</span>}
    </Link>
  );
}
