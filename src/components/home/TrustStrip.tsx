import { MapPin, Ruler, ShieldCheck, Truck } from "lucide-react";
import { HUBS, NETWORK_STATS } from "@/lib/branches";

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
      <ul className="container-fluid grid grid-cols-2 lg:grid-cols-4">
        {items.map((item, position) => (
          <li
            key={item.title}
            className={
              "flex items-center gap-3 py-5 lg:py-6 " +
              (position % 2 === 1 ? "pl-4 max-lg:border-l max-lg:border-border " : "") +
              (position > 0 ? "lg:border-l lg:border-border lg:pl-6" : "") +
              (position >= 2 ? " max-lg:border-t max-lg:border-border" : "")
            }
          >
            <item.icon className="h-5 w-5 shrink-0 text-gold" aria-hidden />
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold leading-tight">
                {item.title}
              </span>
              <span className="block text-xs text-muted-foreground sm:text-[13px]">
                {item.note}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
