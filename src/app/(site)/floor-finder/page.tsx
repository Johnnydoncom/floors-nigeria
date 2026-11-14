import type { Metadata } from "next";
import { Suspense } from "react";
import { FloorFinder } from "@/components/site/FloorFinder";
import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Find My Floor — Flooring Recommendations in 5 Taps",
  description:
    "Answer five quick questions about your room, who uses it and your budget, and get the three floors from Floor Nigeria's range that suit you best — with the reasons why.",
  path: "/floor-finder",
  keywords: [
    "which flooring is best",
    "flooring for kitchen Nigeria",
    "best floor for kids and pets",
    "flooring recommendation",
  ],
});

export default function FloorFinderPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Find My Floor", url: "/floor-finder" },
          ]),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <p className="eyebrow">Find my floor</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
          Five taps to the right floor.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Tell us about the space and how it&apos;s used. We&apos;ll match you with the floors we
          stock that suit it best, and say why.
        </p>
      </section>

      <section className="container-fluid py-12 md:py-16">
        <Suspense fallback={<div className="min-h-[420px]" />}>
          <FloorFinder />
        </Suspense>
      </section>
    </>
  );
}
