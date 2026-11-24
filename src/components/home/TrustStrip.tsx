import { MapPin, Ruler, ShieldCheck, Truck } from "lucide-react";
import { HUBS, NETWORK_STATS } from "@/lib/branches";
import { cn } from "@/lib/utils";

/** What every order comes with, straight under the hero. */
export function TrustStrip() {
  const items = [
    {
      icon: MapPin,
      title: `${NETWORK_STATS.branches} branches in ${HUBS.length} cities`,
      note: "Walk on the floors before you choose",
    },
    { icon: Ruler, title: "Free site survey", note: "We measure and quote in Lagos" },
    { icon: Truck, title: "Nationwide delivery", note: "From our Lagos warehouses" },
    { icon: ShieldCheck, title: "Installed by our own crews", note: "5-year workmanship cover" },
  ];

  return (
    <div className="border-b border-border bg-background">
      {/* Phones: a row of compact cards that scrolls sideways. Wide: four columns. */}
      <ul
        aria-label="What every order comes with"
        className="container-fluid scrollbar-none relative flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto py-3 lg:grid lg:grid-cols-4 lg:gap-0 lg:overflow-visible lg:py-0"
      >
        {items.map((item, position) => (
          <li
            key={item.title}
            className={cn(
              "flex shrink-0 snap-start items-center gap-3 rounded-full border border-border bg-surface/60 py-2 pl-3 pr-4",
              "lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent lg:py-6 lg:pl-6 lg:pr-0",
              position === 0 && "lg:border-l-0 lg:pl-0",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0 text-gold" aria-hidden />
            <span className="min-w-0">
              <span className="block whitespace-nowrap font-display text-[13px] font-semibold leading-tight lg:text-sm">
                {item.title}
              </span>
              <span className="block whitespace-nowrap text-xs text-muted-foreground lg:whitespace-normal lg:text-[13px]">
                {item.note}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
