import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { getPortfolio } from "@/lib/api/content";
import type { PortfolioProject } from "@/lib/api/types";
import { area } from "@/lib/format";

/** Real reference projects: one large, the next few as a list beside it. */
export async function ProjectsShowcase() {
  const projects = (await getPortfolio({ limit: 5 })).filter((project) => project.image_url);
  if (projects.length === 0) return null;

  const [lead, ...others] = projects;

  return (
    <section aria-labelledby="home-projects" className="container-fluid py-16 md:py-24">
      <SectionHeader
        id="home-projects"
        title="Recent projects"
        lead="Hotels, offices and homes we have floored, from survey to the last skirting board."
        action={{ label: "See all projects", href: "/projects" }}
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <Link href={`/projects/${lead.slug}`} className="group lg:col-span-7">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
            <Image
              src={lead.image_url!}
              alt={lead.title}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          </div>
          <div className="mt-5 flex items-start justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                {lead.title}
              </h3>
              <p className="mt-1 text-muted-foreground">{facts(lead)}</p>
              {lead.summary && (
                <p className="mt-3 max-w-xl text-pretty leading-relaxed">{lead.summary}</p>
              )}
            </div>
            <ArrowUpRight
              className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground"
              aria-hidden
            />
          </div>
        </Link>

        <ul className="divide-y divide-border border-y border-border lg:col-span-5 lg:self-start">
          {others.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.slug}`}
                className="group flex items-center gap-4 py-4"
              >
                <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={project.image_url!}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold group-hover:underline group-hover:underline-offset-4">
                    {project.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {facts(project)}
                  </span>
                  {project.floors.length > 0 && (
                    <span className="mt-1 block truncate text-sm">
                      {project.floors.slice(0, 3).join(", ")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "Hospitality, Victoria Island, 3,200 m²" — whichever of these the project has. */
function facts(project: PortfolioProject): string {
  return [
    project.sector,
    project.location ?? project.city,
    project.area_sqm ? area(project.area_sqm) : null,
  ]
    .filter(Boolean)
    .join(", ");
}
