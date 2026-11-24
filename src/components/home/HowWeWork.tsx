import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

/** A real sequence, so it is numbered: what happens between choosing and walking on it. */
const STEPS = [
  {
    title: "Choose your floor",
    text: "Online, in one of our showrooms, or from samples on your own floor at home.",
  },
  {
    title: "We survey the site",
    text: "We measure every room and check the subfloor, free of charge in Lagos.",
  },
  {
    title: "You get one written price",
    text: "Materials, accessories, delivery and installation, itemised in a single quotation.",
  },
  {
    title: "Our crews lay it",
    text: "Delivered from our warehouses and installed by our own team, with a 5-year workmanship cover.",
  },
];

export function HowWeWork() {
  return (
    <section
      aria-labelledby="home-how"
      className="border-y border-border bg-surface py-16 md:py-24"
    >
      <div className="container-fluid">
        <SectionHeader
          id="home-how"
          title="From first visit to finished floor"
          lead="One team from start to finish, so there's no one to chase between the shop and the fitter."
        />

        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, position) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-gold font-display text-base font-semibold text-foreground">
                  {position + 1}
                </span>
                {position < STEPS.length - 1 && (
                  <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
                )}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/contact?enquiry=survey" className="btn btn-primary">
            Book a free site survey <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/calculator" className="btn btn-outline">
            Estimate the cost first
          </Link>
        </div>
      </div>
    </section>
  );
}
