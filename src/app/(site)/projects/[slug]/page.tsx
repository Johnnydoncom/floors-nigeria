import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, MapPin, Ruler } from "lucide-react";
import { FloorCard } from "@/components/catalog/FloorCard";
import { PhotoGallery, type GalleryPhoto } from "@/components/content/PhotoGallery";
import { ProjectCard, areaLabel, placeLabel } from "@/components/content/ProjectCard";
import { ContentImage } from "@/components/site/ContentImage";
import { JsonLd } from "@/components/site/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { getCategories } from "@/lib/api/catalog";
import { getPortfolio, getPortfolioProject } from "@/lib/api/content";
import type { Media } from "@/lib/api/types";
import { categoryHref, indexCategories } from "@/lib/floor-families";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, breadcrumbSchema } from "@/lib/structured-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await getPortfolioProject((await params).slug);

  if (!project) return { title: "Project not found", robots: { index: false } };

  return pageMetadata({
    title:
      project.seo.title === project.title
        ? `${project.title} — ${project.sector} Flooring Project`
        : project.seo.title,
    description: project.seo.description ?? project.summary,
    path: project.seo.canonical ?? `/projects/${project.slug}`,
    image: project.seo.og_image ?? project.image_url,
    imageAlt: project.title,
    noindex: project.seo.noindex,
    type: "article",
  });
}

function photos(media: Media[], fallbackAlt: string): GalleryPhoto[] {
  return media.map((item) => ({
    id: item.id,
    src: item.large_url,
    thumb: item.preview_url,
    alt: item.alt && item.alt !== item.caption ? item.alt : fallbackAlt,
    caption: item.caption,
  }));
}

export default async function ProjectPage({ params }: PageProps) {
  const project = await getPortfolioProject((await params).slug);

  if (!project) notFound();

  const [categories, portfolio] = await Promise.all([
    project.floors.length ? getCategories().catch(() => []) : Promise.resolve([]),
    getPortfolio({ limit: 12 }),
  ]);
  const index = indexCategories(categories);
  const floors = project.floors.flatMap((slug) => {
    const category = index.get(slug);
    return category ? [category] : [];
  });
  const others = portfolio.filter((other) => other.slug !== project.slug).slice(0, 3);
  const place = placeLabel(project);
  const area = areaLabel(project.area_sqm);
  const gallery = photos(project.gallery, project.title);
  const beforeAfter = Math.min(project.before.length, project.after.length);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Projects", url: "/projects" },
    { name: project.title, url: `/projects/${project.slug}` },
  ];

  const facts = [
    { icon: Building2, label: "Sector", value: project.sector },
    place ? { icon: MapPin, label: "Location", value: place } : null,
    area ? { icon: Ruler, label: "Area", value: area } : null,
    project.completed_on
      ? { icon: CalendarDays, label: "Completed", value: formatDate(project.completed_on) }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: project.summary,
            image: project.image_url ? absoluteUrl(project.image_url) : undefined,
            url: absoluteUrl(`/projects/${project.slug}`),
            ...(place ? { locationCreated: { "@type": "Place", name: `${place}, Nigeria` } } : {}),
            creator: { "@id": absoluteUrl("/#organization") },
          },
          breadcrumbSchema(trail),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/projects" className="inline-flex items-center gap-1.5 hover:text-gold">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All projects
          </Link>
        </nav>

        <p className="eyebrow mt-8">{[project.sector, project.city].filter(Boolean).join(" · ")}</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
          {project.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{project.summary}</p>
      </section>

      <section className="container-fluid pt-10">
        {project.image_url && (
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted md:aspect-[21/9]">
            <ContentImage
              src={project.image_url}
              alt={`${project.title}${place ? `, ${place}` : ""}`}
              sizes="100vw"
              priority
            />
          </div>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-3 bg-background p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-gold">
                <fact.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="font-display text-lg">{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {project.body && (
        <section className="container-fluid py-14 md:py-16">
          <div className="mx-auto max-w-3xl">
            <Markdown source={project.body} />
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="container-fluid py-10" aria-labelledby="gallery-heading">
          <h2 id="gallery-heading" className="font-display text-2xl tracking-tight md:text-3xl">
            Project gallery
          </h2>
          <div className="mt-8">
            <PhotoGallery photos={gallery} label={project.title} />
          </div>
        </section>
      )}

      {beforeAfter > 0 && (
        <section className="container-fluid py-10" aria-labelledby="before-after-heading">
          <h2
            id="before-after-heading"
            className="font-display text-2xl tracking-tight md:text-3xl"
          >
            Before &amp; after
          </h2>
          <div className="mt-8 space-y-6">
            {Array.from({ length: beforeAfter }, (_, pair) => (
              <div key={pair} className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Before", media: project.before[pair] },
                  { label: "After", media: project.after[pair] },
                ].map(({ label, media }) => (
                  <figure
                    key={label}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
                  >
                    <ContentImage
                      src={media.preview_url}
                      alt={`${label}: ${media.alt ?? project.title}`}
                      sizes="(min-width: 640px) 50vw, 100vw"
                    />
                    <figcaption className="absolute left-3 top-3 rounded-full bg-charcoal-dark/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                      {label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {floors.length > 0 && (
        <section className="container-fluid py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Planning something similar?</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                Floors for {project.sector.toLowerCase()} spaces
              </h2>
            </div>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold hover:text-gold"
            >
              Talk to a specifier
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
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

      {others.length > 0 && (
        <section className="border-t border-border bg-surface py-16 md:py-20">
          <div className="container-fluid">
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">More projects</h2>
            <div className="mt-8 grid gap-x-5 gap-y-8 md:grid-cols-3">
              {others.map((other) => (
                <ProjectCard key={other.id} project={other} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
