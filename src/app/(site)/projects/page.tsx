import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ProjectCard } from "@/components/content/ProjectCard";
import { JsonLd } from "@/components/site/JsonLd";
import { Reveal } from "@/components/site/Reveal";
import { getPortfolio } from "@/lib/api/content";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Flooring Projects in Nigeria",
  description:
    "Selected flooring commissions across hospitality, commercial and residential sectors in Lagos, Abuja and beyond.",
  path: "/projects",
});

export default async function Projects() {
  const projects = await getPortfolio();

  return (
    <>
      <JsonLd
        data={[
          itemListSchema(
            projects.map((project) => ({ name: project.title, url: `/projects/${project.slug}` })),
          ),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Projects", url: "/projects" },
          ]),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <Reveal>
          <p className="eyebrow">Portfolio</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl tracking-tight text-balance md:text-7xl">
            Specified for the country&apos;s most demanding buildings.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Selected commissions across hospitality, commercial and private residential.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid space-y-16 py-16 md:space-y-20">
        {projects.length === 0 ? (
          <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">
            Our project portfolio is being updated. Visit again soon, or{" "}
            <Link href="/contact" className="font-medium text-foreground underline">
              ask us
            </Link>{" "}
            for references in your sector.
          </p>
        ) : (
          projects.map((project, index) => (
            <Reveal key={project.id} delay={(index % 3) * 0.06}>
              <ProjectCard
                project={project}
                layout="row"
                flip={index % 2 === 1}
                headingLevel="h2"
              />
            </Reveal>
          ))
        )}
      </section>

      <section className="bg-charcoal-dark py-16 text-primary-foreground md:py-20">
        <div className="container-fluid flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="eyebrow text-gold-light">Planning a project?</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl tracking-tight md:text-4xl">
              Tell us about the space and we&apos;ll specify, supply and install it.
            </h2>
          </div>
          <Link href="/contact" className="btn btn-gold">
            Talk to a specifier <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
