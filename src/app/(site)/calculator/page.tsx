import type { Metadata } from "next";
import { FloorCalculator } from "@/components/site/FloorCalculator";
import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Floor Calculator — Square Metres, Wastage & Cost",
  description:
    "Work out how many square metres of flooring you need, with a wastage allowance and installation cost in naira. Free floor area calculator from Floor Nigeria.",
  path: "/calculator",
  keywords: [
    "floor calculator",
    "flooring square metre calculator",
    "flooring cost Nigeria",
    "how much flooring do I need",
  ],
});

/**
 * Answered on the page and repeated as FAQPage data, so the calculator can
 * surface as a rich result for "how much flooring do I need" searches.
 */
const faqs = [
  {
    q: "How do I calculate how much flooring I need?",
    a: "Multiply the room's length by its width in metres to get the floor area in square metres, then add a wastage allowance for cuts and offcuts. Order the area plus wastage, rounded up to whole packs.",
  },
  {
    q: "How much wastage should I allow?",
    a: "Allow 10% for straight-laid planks and tiles in a regular room. Herringbone, chevron and diagonal layouts, or rooms with many corners, need around 15%.",
  },
  {
    q: "Does the estimate include installation?",
    a: "Yes. The estimate adds installation per square metre of floor area by our own crews. Subfloor levelling, skirting and delivery are confirmed after a free site survey.",
  },
];

export default function CalculatorPage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Floor Calculator", url: "/calculator" },
          ]),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <p className="eyebrow">Planning tools</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
          Floor calculator: precise budgets, zero guesswork.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Enter your room, choose a product, and get the order quantity with wastage and a costed
          estimate including installation.
        </p>
      </section>

      <FloorCalculator />

      <section className="border-t border-border bg-surface">
        <div className="container-fluid grid gap-10 py-16 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Measuring for a new floor</h2>
          </div>
          <dl className="space-y-8 lg:col-span-8">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-border pb-8 last:border-0 last:pb-0">
                <dt className="font-display text-lg font-semibold">{faq.q}</dt>
                <dd className="mt-2 leading-relaxed text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
