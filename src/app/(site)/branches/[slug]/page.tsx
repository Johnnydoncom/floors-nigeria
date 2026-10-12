import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight, Mail, MapPin, Phone, Signpost } from "lucide-react";
import { BranchCard } from "@/components/branches/BranchCard";
import { NetworkMap } from "@/components/branches/NetworkMap";
import { JsonLd } from "@/components/site/JsonLd";
import {
  BRANCHES,
  COUNTRIES,
  HEAD_OFFICE,
  KIND_LABELS,
  NETWORK_STATS,
  REGIONS,
  branchTitle,
  directionsUrl,
  formatPhone,
  fullAddress,
  getBranch,
  mapEmbedUrl,
  type Branch,
  type HubId,
} from "@/lib/branches";
import { pageMetadata } from "@/lib/seo";
import { branchSchema, breadcrumbSchema } from "@/lib/structured-data";

type PageProps = { params: Promise<{ slug: string }> };

const COUNTS = BRANCHES.reduce<Partial<Record<HubId, number>>>((counts, branch) => {
  counts[branch.hub] = (counts[branch.hub] ?? 0) + 1;
  return counts;
}, {});

export function generateStaticParams() {
  return BRANCHES.map((branch) => ({ slug: branch.slug }));
}

function place(branch: Branch): string {
  return branch.area === branch.city ? branch.city : `${branch.area}, ${branch.city}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const branch = getBranch((await params).slug);

  if (!branch) return { title: "Branch not found", robots: { index: false } };

  const phone = branch.phones[0] ? ` Call ${formatPhone(branch.phones[0])} or` : "";

  return pageMetadata({
    title: `${branchTitle(branch)} — ${KIND_LABELS[branch.kind]} in ${place(branch)}`,
    description: `${branchTitle(branch)}, ${fullAddress(branch)}.${phone} get directions to see SPC, vinyl, laminate, wood and epoxy flooring in person.`,
    path: `/branches/${branch.slug}`,
    keywords: [
      `flooring ${branch.city}`,
      `flooring shop ${branch.city}`,
      `Floor Nigeria ${branch.name}`,
    ],
  });
}

export default async function BranchPage({ params }: PageProps) {
  const branch = getBranch((await params).slug);

  if (!branch) notFound();

  const region = REGIONS.find((item) => item.id === branch.region)!;
  const neighbours = BRANCHES.filter(
    (item) => item.region === branch.region && item.slug !== branch.slug,
  );
  // A branch alone in its region points customers back to the head office.
  const related =
    neighbours.length > 0 ? neighbours : branch.kind === "head-office" ? [] : [HEAD_OFFICE];
  const position = (item: Branch) => BRANCHES.indexOf(item) + 1;

  return (
    <>
      <JsonLd
        data={[
          branchSchema(branch),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Branches", url: "/branches" },
            { name: branch.name, url: `/branches/${branch.slug}` },
          ]),
        ]}
      />

      <section className="container-fluid pt-header md:pt-[calc(var(--header-height)+2rem)]">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/branches" className="transition hover:text-foreground">
                Branches
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              {region.name}
            </li>
            <li aria-current="page" className="flex items-center gap-1.5 text-foreground">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {branch.name}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-7">
            <p className="eyebrow">
              {KIND_LABELS[branch.kind]} ·{" "}
              {branch.country === "NG" ? region.name : COUNTRIES[branch.country]}
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-balance md:text-6xl md:leading-[1.05]">
              {branchTitle(branch)}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {place(branch)}
              {branch.city !== branch.state && `, ${branch.state}`}
            </p>

            <address className="mt-10 space-y-4 not-italic">
              <p className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
                  <MapPin className="h-4 w-4 text-gold" aria-hidden />
                </span>
                <span className="pt-1.5 text-lg leading-relaxed">
                  {branch.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
              {branch.landmark && (
                <p className="flex items-start gap-4 text-muted-foreground">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
                    <Signpost className="h-4 w-4 text-gold" aria-hidden />
                  </span>
                  <span className="pt-2">{branch.landmark}</span>
                </p>
              )}
            </address>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={directionsUrl(branch)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Get directions <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
              {branch.phones[0] && (
                <a href={`tel:${branch.phones[0]}`} className="btn btn-outline">
                  <Phone className="h-4 w-4" aria-hidden /> {formatPhone(branch.phones[0])}
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-charcoal-dark p-4 text-primary-foreground sm:p-6">
              <NetworkMap
                counts={COUNTS}
                active={[branch.hub]}
                title={`${branch.city} on the Floor Nigeria branch network`}
              />
              <p className="mt-3 border-t border-white/10 pt-3 text-xs text-primary-foreground/60">
                One of {NETWORK_STATS.locations} Floor Nigeria locations across{" "}
                {NETWORK_STATS.countries} countries.{" "}
                <Link href="/branches" className="text-gold-light hover:underline">
                  See them all
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid grid gap-6 py-16 md:py-20 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface lg:col-span-8">
          <iframe
            src={mapEmbedUrl(branch)}
            title={`Map: ${branchTitle(branch)}, ${branch.address.join(", ")}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block aspect-[4/3] h-full w-full grayscale-[0.6] md:aspect-[16/10]"
          />
        </div>

        <aside className="flex flex-col rounded-2xl border border-border p-6 md:p-8 lg:col-span-4">
          <h2 className="font-display text-xl tracking-tight">Contact this branch</h2>

          {branch.phones.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow text-muted-foreground">Phone</p>
              <ul className="mt-3 space-y-2">
                {branch.phones.map((phone) => (
                  <li key={phone}>
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-3 font-mono text-lg transition hover:text-gold"
                    >
                      <Phone className="h-4 w-4 text-gold" aria-hidden />
                      {formatPhone(phone)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {branch.emails.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow text-muted-foreground">Email</p>
              <ul className="mt-3 space-y-2">
                {branch.emails.map((email) => (
                  <li key={email}>
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-start gap-3 break-all transition hover:text-gold"
                    >
                      <Mail className="mt-1 h-4 w-4 shrink-0 text-gold" aria-hidden />
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-auto border-t border-border pt-6 text-sm text-muted-foreground text-pretty">
            Planning a visit for a particular floor? Call ahead and we&apos;ll confirm it&apos;s on
            display.
          </p>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container-fluid pb-20 md:pb-28">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{neighbours.length > 0 ? region.name : "Head office"}</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                {neighbours.length > 0 ? `More Floor Nigeria in ${region.name}` : "Our head office"}
              </h2>
            </div>
            <Link
              href="/branches"
              className="inline-flex items-center gap-2 font-display text-sm font-semibold transition hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> All branches
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <BranchCard key={item.slug} branch={item} index={position(item)} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
