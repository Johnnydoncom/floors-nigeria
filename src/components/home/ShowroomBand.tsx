import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NetworkMap } from "@/components/branches/NetworkMap";
import WhatsAppIcon from "@/components/catalog/WhatsAppIcon";
import { BRANCHES, NETWORK_STATS, REGIONS, type HubId } from "@/lib/branches";
import { whatsAppLink } from "@/lib/format";
import { WHATSAPP_NUMBER } from "@/lib/site-contact";

const COUNTS = BRANCHES.reduce<Partial<Record<HubId, number>>>((counts, branch) => {
  counts[branch.hub] = (counts[branch.hub] ?? 0) + 1;
  return counts;
}, {});

/** Where to walk on the floors: every showroom, grouped by region, on the network map. */
export function ShowroomBand() {
  const regions = REGIONS.map((region) => ({
    ...region,
    branches: BRANCHES.filter(
      (branch) => branch.region === region.id && branch.kind !== "warehouse",
    ),
  })).filter((region) => region.branches.length > 0);

  return (
    <section
      aria-labelledby="home-showrooms"
      className="overflow-hidden bg-charcoal py-16 text-primary-foreground md:py-24"
    >
      <div className="container-fluid grid items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2
            id="home-showrooms"
            className="text-balance font-display text-[1.9rem] leading-[1.1] tracking-[-0.02em] md:text-[2.6rem]"
          >
            Walk on the floors before you choose
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-primary-foreground/70 md:text-lg">
            {NETWORK_STATS.branches} branches across {NETWORK_STATS.states} Nigerian states and the
            FCT, plus Ghana, Togo and Benin, with samples of every floor we sell.
          </p>

          <dl className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {regions.map((region) => (
              <div key={region.id}>
                <dt className="font-display text-sm font-semibold text-gold-light">
                  {region.name}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-primary-foreground/80">
                  {region.branches.map((branch, position) => (
                    <span key={branch.slug}>
                      {position > 0 && ", "}
                      <Link
                        href={`/branches/${branch.slug}`}
                        className="underline-offset-4 hover:text-primary-foreground hover:underline"
                      >
                        {branch.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/branches" className="btn btn-gold">
              Find your nearest showroom <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={whatsAppLink(
                WHATSAPP_NUMBER,
                "Hello Floor Nigeria, which showroom is closest to me?",
              )}
              className="btn btn-outline-light"
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" /> Ask on WhatsApp
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <NetworkMap counts={COUNTS} className="mx-auto max-w-2xl" />
        </div>
      </div>
    </section>
  );
}
