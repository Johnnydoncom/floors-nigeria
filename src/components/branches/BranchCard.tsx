import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail, MapPin, Phone, Signpost } from "lucide-react";
import {
  COUNTRIES,
  HEAD_OFFICE,
  KIND_LABELS,
  directionsUrl,
  formatPhone,
  type Branch,
} from "@/lib/branches";
import { cn } from "@/lib/utils";

/**
 * One location in the directory. No hooks, so branch pages can render it on
 * the server; the locator adds hover handlers to light the city on the map.
 */
export function BranchCard({
  branch,
  index,
  highlighted = false,
  onEnter,
  onLeave,
}: {
  branch: Branch;
  /** Position in the full network, shown as "01", "02"… */
  index: number;
  highlighted?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const isHeadOffice = branch.kind === "head-office";
  const isWarehouse = branch.kind === "warehouse";

  return (
    <article
      id={`branch-${branch.slug}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn(
        "group relative flex scroll-mt-48 flex-col rounded-xl border bg-card p-6 transition duration-300",
        "hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)]",
        isWarehouse ? "border-dashed border-border" : "border-border",
        highlighted && "border-gold shadow-[0_0_0_1px_var(--gold)]",
      )}
    >
      {/* A thin gold rule that draws in on hover. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-6 top-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100",
          highlighted && "scale-x-100",
        )}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {String(index).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em]",
              isHeadOffice && "bg-gold text-charcoal-dark",
              isWarehouse && "border border-dashed border-foreground/30 text-foreground/70",
              !isHeadOffice && !isWarehouse && "bg-surface text-foreground/70",
            )}
          >
            {KIND_LABELS[branch.kind]}
          </span>
        </div>
        {branch.country !== "NG" && (
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            {COUNTRIES[branch.country]}
          </span>
        )}
      </div>

      <h3 className="mt-5 font-display text-2xl tracking-tight">{branch.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {branch.area === branch.city ? branch.state : `${branch.area} · ${branch.city}`}
      </p>

      {branch.pending ? (
        <div className="mt-5 flex-1 rounded-lg bg-surface p-4 text-sm text-muted-foreground">
          <p>
            Contact details for our {branch.name} branch are being updated. Call the head office and
            we&apos;ll direct you to it.
          </p>
          <a
            href={`tel:${HEAD_OFFICE.phones[0]}`}
            className="mt-3 inline-flex items-center gap-2 font-mono font-medium text-foreground hover:text-gold"
          >
            <Phone className="h-4 w-4 text-gold" aria-hidden />
            {formatPhone(HEAD_OFFICE.phones[0])}
          </a>
        </div>
      ) : (
        <address className="mt-5 flex-1 space-y-3 text-sm not-italic">
          <p className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            <span>
              {branch.address.map((addressLine) => (
                <span key={addressLine} className="block">
                  {addressLine}
                </span>
              ))}
            </span>
          </p>
          {branch.landmark && (
            <p className="flex items-start gap-3 text-muted-foreground">
              <Signpost className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <span>{branch.landmark}</span>
            </p>
          )}
          {branch.phones.length > 0 && (
            <p className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {branch.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone}`}
                    className="font-mono font-medium transition hover:text-gold"
                  >
                    {formatPhone(phone)}
                  </a>
                ))}
              </span>
            </p>
          )}
          {branch.emails.length > 0 && (
            <p className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <span className="min-w-0 space-y-1">
                {branch.emails.map((email) => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="block break-all text-muted-foreground transition hover:text-gold"
                  >
                    {email}
                  </a>
                ))}
              </span>
            </p>
          )}
        </address>
      )}

      {!branch.pending && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 font-display text-[13px] font-semibold">
          <a
            href={directionsUrl(branch)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition hover:text-gold"
          >
            Directions <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href={`/branches/${branch.slug}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
          >
            Branch details
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
            <span className="sr-only">for {branch.name}</span>
          </Link>
        </div>
      )}
    </article>
  );
}
