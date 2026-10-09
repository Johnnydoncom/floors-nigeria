import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calculator, Clock, Sparkles } from "lucide-react";
import { FloorCard } from "@/components/catalog/FloorCard";
import { PostCard } from "@/components/content/PostCard";
import { ContentImage } from "@/components/site/ContentImage";
import { JsonLd } from "@/components/site/JsonLd";
import { Markdown, outline } from "@/components/site/Markdown";
import { getCategories } from "@/lib/api/catalog";
import { getPost, getPosts } from "@/lib/api/content";
import { categoryHref, indexCategories } from "@/lib/floor-families";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPost((await params).slug);

  if (!post) return { title: "Article not found", robots: { index: false } };

  return pageMetadata({
    title: post.seo.title,
    description: post.seo.description ?? post.excerpt,
    path: post.seo.canonical ?? `/blog/${post.slug}`,
    image: post.seo.og_image ?? post.image_url,
    imageAlt: post.title,
    keywords: post.tags,
    noindex: post.seo.noindex,
    type: "article",
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const post = await getPost((await params).slug);

  if (!post) notFound();

  const [related, categories] = await Promise.all([
    getPosts({ category: post.category.slug, exclude: post.slug, per_page: 3 }),
    post.floors.length ? getCategories().catch(() => []) : Promise.resolve([]),
  ]);
  const index = indexCategories(categories);
  const floors = post.floors.flatMap((slug) => {
    const category = index.get(slug);
    return category ? [category] : [];
  });
  const sections = outline(post.body);
  const url = `/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            description: post.excerpt,
            url,
            image: post.image_url,
            author: post.author,
            publishedAt: post.published_at,
            updatedAt: post.updated_at,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Journal", url: "/blog" },
            { name: post.category.name, url: `/blog/category/${post.category.slug}` },
            { name: post.title, url },
          ]),
        ]}
      />

      <article>
        <header className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <Link href="/blog" className="inline-flex items-center gap-1.5 hover:text-gold">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Journal
              </Link>
            </nav>
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="eyebrow mt-8 inline-block"
            >
              {post.category.name}
            </Link>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-5 text-lg text-muted-foreground text-pretty">{post.excerpt}</p>
            )}
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>By {post.author}</span>
              {post.published_at && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                </>
              )}
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {post.reading_minutes} min read
              </span>
            </p>
          </div>
        </header>

        {post.image_url && (
          <div className="container-fluid pt-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted md:aspect-[21/9]">
              <ContentImage src={post.image_url} alt="" sizes="100vw" priority />
            </div>
          </div>
        )}

        <div className="container-fluid grid gap-10 py-12 md:py-16 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            {sections.length > 1 && (
              <nav
                aria-label="On this page"
                className="sticky top-[calc(var(--header-height)+2rem)]"
              >
                <p className="eyebrow">On this page</p>
                <ul className="mt-4 space-y-2.5 border-l border-border text-sm">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="-ml-px block border-l border-transparent pl-4 text-muted-foreground transition hover:border-gold hover:text-foreground"
                      >
                        {section.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </aside>

          <div className="min-w-0 lg:col-span-7">
            <Markdown source={post.body} />

            {post.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-12 grid gap-3 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
              <Link
                href="/calculator"
                className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-background"
              >
                <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
                <span>
                  <span className="block font-display font-semibold">
                    Work out how much you need
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Rooms, waste and packs in a minute.
                  </span>
                </span>
              </Link>
              <Link
                href="/visualizer"
                className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-background"
              >
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
                <span>
                  <span className="block font-display font-semibold">See it in your room</span>
                  <span className="text-sm text-muted-foreground">
                    Try floors on a photo of your space.
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </article>

      {floors.length > 0 && (
        <section className="container-fluid pb-16">
          <h2 className="font-display text-2xl tracking-tight md:text-3xl">
            Floors in this article
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
            {floors.map((category) => (
              <FloorCard
                key={category.slug}
                href={categoryHref(category.slug)}
                name={category.name}
                image={category.image_url}
                productCount={category.products_count}
              />
            ))}
          </div>
        </section>
      )}

      {related.data.length > 0 && (
        <section className="border-t border-border bg-surface py-16 md:py-20">
          <div className="container-fluid">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">
                More {post.category.name.toLowerCase()}
              </h2>
              <Link
                href={`/blog/category/${post.category.slug}`}
                className="group inline-flex items-center gap-1.5 text-sm font-semibold hover:text-gold"
              >
                See all
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
            <div className="mt-8 grid gap-x-6 gap-y-10 md:grid-cols-3">
              {related.data.map((entry) => (
                <PostCard key={entry.id} post={entry} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
