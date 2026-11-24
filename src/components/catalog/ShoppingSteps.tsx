import Link from "next/link";
import { ArrowRight, MessageSquareQuote, Package, Search, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Find your floor",
    detail: "Filter by room, look and budget — or let Find My Floor suggest one.",
    href: "/floor-finder",
  },
  {
    icon: Sparkles,
    title: "See it in your room",
    detail: "Upload a photo and try any floor, colour and pattern in seconds.",
    href: "/visualizer",
  },
  {
    icon: Package,
    title: "Order a sample",
    detail: "Hold it in your own light before you decide. Delivered nationwide.",
    href: "#catalogue",
  },
  {
    icon: MessageSquareQuote,
    title: "Get a quote",
    detail: "Free site survey in Lagos; supply and professional installation.",
    href: "/contact",
  },
];

/** How buying a floor here works, in the order people actually do it. */
export function ShoppingSteps() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, index) => (
        <li key={step.title} className="bg-background">
          <Link
            href={step.href}
            className="group flex h-full gap-3 p-4 transition hover:bg-surface/70 md:p-5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-foreground">
              <step.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-display text-sm font-semibold">
                <span className="font-mono text-[11px] text-muted-foreground">0{index + 1}</span>
                {step.title}
                <ArrowRight
                  className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {step.detail}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
