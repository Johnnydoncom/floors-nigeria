import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { ContentImage } from "@/components/site/ContentImage";
import type { PortfolioProject } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** "4,200 m²", or null when the area is not recorded. */
export function areaLabel(areaSqm: number | null): string | null {
  return areaSqm === null
    ? null
    : `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(areaSqm)} m²`;
}

/** "Victoria Island, Lagos" from whichever parts are known. */
export function placeLabel(project: Pick<PortfolioProject, "location" | "city">): string {
  return [project.location, project.city].filter(Boolean).join(", ");
}

/**
 * A portfolio project as a wide row (the portfolio page) or a compact card
 * (homepage, related projects).
 */
export function ProjectCard({
  project,
  layout = "card",
  flip = false,
  headingLevel = "h3",
}: {
  project: PortfolioProject;
  layout?: "card" | "row";
  flip?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const area = areaLabel(project.area_sqm);
  const place = placeLabel(project);
  const kicker = [project.sector, area].filter(Boolean).join(" · ");

  if (layout === "row") {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className="group grid items-center gap-6 md:grid-cols-12"
      >
        <div className={cn("md:col-span-7", flip && "md:order-2")}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
            {project.image_url && (
              <ContentImage
                src={project.image_url}
                alt={project.title}
                sizes="(min-width: 768px) 58vw, 100vw"
                className="transition-transform duration-[1.2s] group-hover:scale-105"
              />
            )}
          </div>
        </div>
        <div className="md:col-span-5">
          <p className="eyebrow">{kicker}</p>
          <Heading className="mt-2 font-display text-3xl tracking-tight transition group-hover:text-gold md:text-5xl">
            {project.title}
          </Heading>
          {place && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {place}
            </p>
          )}
          <p className="mt-4 text-muted-foreground">{project.summary}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
            View project
            <ArrowUpRight
              className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        {project.image_url && (
          <ContentImage
            src={project.image_url}
            alt={project.title}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="transition-transform duration-[1.2s] group-hover:scale-105"
          />
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {kicker}
      </p>
      <Heading className="mt-1 font-display text-xl tracking-tight transition group-hover:text-gold">
        {project.title}
      </Heading>
      {place && <p className="mt-1 text-sm text-muted-foreground">{place}</p>}
    </Link>
  );
}
