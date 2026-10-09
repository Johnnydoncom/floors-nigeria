import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import { PhotoGallery } from "@/components/content/PhotoGallery";
import { ContentImage } from "@/components/site/ContentImage";
import { JsonLd } from "@/components/site/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { getPage } from "@/lib/api/content";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";

/**
 * Editable CMS pages — FAQs, delivery, terms, privacy — served at clean
 * root URLs (`/faqs`). Fixed routes always win over this one, and the API
 * refuses page slugs those routes use; anything else unknown is a 404.
 */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPage((await params).slug);

  if (!page) return { title: "Page not found", robots: { index: false } };

  return pageMetadata({
    title: page.seo.title,
    description: page.seo.description ?? page.excerpt,
    path: page.seo.canonical ?? `/${page.slug}`,
    image: page.seo.og_image ?? page.image_url,
    imageAlt: page.title,
    noindex: page.seo.noindex,
  });
}

export default async function ContentPageRoute({ params }: PageProps) {
  const page = await getPage((await params).slug);

  if (!page) notFound();

  const gallery = page.gallery.map((item) => ({
    id: item.id,
    src: item.large_url,
    thumb: item.preview_url,
    alt: item.alt ?? page.title,
    caption: item.caption,
  }));

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: page.title, url: `/${page.slug}` },
          ]),
          ...(page.faqs.length ? [faqSchema(page.faqs)] : []),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <div className="mx-auto max-w-3xl">
          {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
          <h1 className="mt-4 font-display text-4xl tracking-tight text-balance md:text-6xl">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-5 text-lg text-muted-foreground text-pretty">{page.excerpt}</p>
          )}
          {page.updated_at && (
            <p className="mt-4 text-xs text-muted-foreground">
              Last updated <time dateTime={page.updated_at}>{formatDate(page.updated_at)}</time>
            </p>
          )}
        </div>
      </section>

      {page.image_url && (
        <div className="container-fluid pt-10">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted md:aspect-[21/8]">
            <ContentImage src={page.image_url} alt="" sizes="100vw" priority />
          </div>
        </div>
      )}

      <section className="container-fluid py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Markdown source={page.body} />

          {page.faqs.length > 0 && (
            <div className="mt-10 divide-y divide-border rounded-xl border border-border">
              {page.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group px-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-base font-semibold md:text-lg">
                    {faq.question}
                    <Plus
                      className="h-5 w-5 shrink-0 text-gold transition-transform group-open:rotate-45"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-5 text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="container-fluid pb-16">
          <PhotoGallery photos={gallery} label={page.title} />
        </section>
      )}

      <section className="border-t border-border bg-surface py-14">
        <div className="container-fluid flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Still have a question?</h2>
            <p className="mt-1 text-muted-foreground">
              Our consultants answer by phone, WhatsApp and email.
            </p>
          </div>
          <Link href="/contact" className="btn btn-primary">
            Contact us <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
