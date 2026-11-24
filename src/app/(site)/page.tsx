import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/site/JsonLd";
import { HomeHero, HomeHeroFallback } from "@/components/home/HomeHero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { FloorBento } from "@/components/home/FloorBento";
import { Bestsellers, BestsellersSkeleton } from "@/components/home/Bestsellers";
import { VisualizerBand } from "@/components/home/VisualizerBand";
import { SpacesRail } from "@/components/home/SpacesRail";
import { ProjectsShowcase } from "@/components/home/ProjectsShowcase";
import { HowWeWork } from "@/components/home/HowWeWork";
import { ShowroomBand } from "@/components/home/ShowroomBand";
import { AdviceSection } from "@/components/home/AdviceSection";
import { ClosingCta } from "@/components/home/ClosingCta";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import {
  DEFAULT_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  pageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: SEO_KEYWORDS,
  }),
  // The homepage title is the brand line itself, not "<page> — Floors NG".
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
};

/**
 * The homepage, in the order a visitor decides: what we sell and what it
 * costs, what is popular, what it would look like at home, who we have done
 * it for, how it gets done, where to see it, and how to start.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      <Suspense fallback={<HomeHeroFallback />}>
        <HomeHero />
      </Suspense>
      <TrustStrip />

      <Suspense fallback={<SectionSkeleton />}>
        <FloorBento />
      </Suspense>
      <Suspense fallback={<BestsellersSkeleton />}>
        <Bestsellers />
      </Suspense>
      <Suspense fallback={<SectionSkeleton dark />}>
        <VisualizerBand />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <SpacesRail />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ProjectsShowcase />
      </Suspense>
      <HowWeWork />
      <ShowroomBand />
      <Suspense fallback={<SectionSkeleton />}>
        <AdviceSection />
      </Suspense>
      <ClosingCta />
    </>
  );
}

function SectionSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? "bg-charcoal-dark py-16 md:py-24" : "py-16 md:py-24"}>
      <div className="container-fluid">
        <div
          className={`h-10 w-72 animate-pulse rounded ${dark ? "bg-primary-foreground/10" : "bg-muted"}`}
        />
        <div
          className={`mt-10 h-80 animate-pulse rounded-lg ${dark ? "bg-primary-foreground/10" : "bg-muted"}`}
        />
      </div>
    </div>
  );
}
