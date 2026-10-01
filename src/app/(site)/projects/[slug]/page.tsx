import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, MapPin, Ruler, Building2 } from "lucide-react";
import { FloorCard } from "@/components/catalog/FloorCard";
import { JsonLd } from "@/components/site/JsonLd";
import { getCategories } from "@/lib/api/catalog";
import { categoryHref, indexCategories } from "@/lib/floor-families";
import { PROJECTS, getProject, projectSummary } from "@/lib/content/projects";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, breadcrumbSchema } from "@/lib/structured-data";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = getProject((await params).slug);

  if (!project) return { title: "Project not found", robots: { index: false } };

  return pageMetadata({
    title: `${project.name} — ${project.sector} Flooring Project`,
    description: projectSummary(project),
    path: `/projects/${project.slug}`,
    image: project.image,
    imageAlt: project.name,
    type: "article",
  });
}

export default async function ProjectPage({ params }: PageProps) {
  const project = getProject((await params).slug);

  if (!project) notFound();

  const categories = await getCategories().catch(() => []);
  const index = indexCategories(categories);
  const floors = project.floors.flatMap((slug) => {
    const category = index.get(slug);
    return category ? [category] : [];
  });

  const others = PROJECTS.filter((other) => other.slug !== project.slug).slice(0, 3);
  const trail = [
    { name: "Home", url: "/" },
    { name: "Projects", url: "/projects" },
    { name: project.name, url: `/projects/${project.slug}` },
  ];

  const facts = [
    { icon: Building2, label: "Sector", value: project.sector },
    { icon: MapPin, label: "Location", value: `${project.location}, ${project.city}` },
    { icon: Ruler, label: "Area", value: project.area },
  ];

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.name,
            description: projectSummary(project),
            image: absoluteUrl(project.image),
            url: absoluteUrl(`/projects/${project.slug}`),
            locationCreated: {
              "@type": "Place",
              name: `${project.location}, ${project.city}, Nigeria`,
            },
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

        <p className="eyebrow mt-8">
          {project.sector} · {project.city}
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
          {project.name}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{projectSummary(project)}</p>
      </section>

      <section className="container-fluid pt-10">
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted md:aspect-[21/9]">
          <Image
            src={project.image}
            alt={`${project.name}, ${project.location}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
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
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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

      <section className="border-t border-border bg-surface py-16 md:py-20">
        <div className="container-fluid">
          <h2 className="font-display text-2xl tracking-tight md:text-3xl">More projects</h2>
          <div className="mt-8 grid gap-x-5 gap-y-8 md:grid-cols-3">
            {others.map((other) => (
              <Link key={other.slug} href={`/projects/${other.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={other.image}
                    alt={other.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {other.sector} · {other.area}
                </p>
                <h3 className="mt-1 font-display text-xl tracking-tight transition group-hover:text-gold">
                  {other.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
