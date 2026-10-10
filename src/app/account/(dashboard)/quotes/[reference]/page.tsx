import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { getQuote } from "@/lib/api/account";
import { formatDate, naira, number, whatsAppLink } from "@/lib/format";
import { WHATSAPP_NUMBER } from "@/lib/site-contact";
import { Logo } from "@/components/site/Logo";
import { StatusBadge, quoteSummary } from "@/components/account/display";
import { PrintButton } from "@/components/account/PrintButton";

type PageProps = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Quote ${decodeURIComponent(reference)}` };
}

const UNIT_LABELS: Record<string, string> = {
  sqm: "m²",
  pack: "packs",
  box: "boxes",
  roll: "rolls",
  piece: "pcs",
  lm: "m",
};

/**
 * A quote as a document the customer can print or save as PDF and hand to
 * whoever is paying. Only the priced lines come from the CRM; nothing here is
 * estimated in the browser.
 */
export default async function QuotePage({ params }: PageProps) {
  const { reference } = await params;
  const quote = await getQuote(decodeURIComponent(reference));

  if (!quote) notFound();

  const items = quote.items ?? [];
  const isPriced = items.length > 0 && quote.totals.total > 0;
  const location = [quote.project.city, quote.project.state].filter(Boolean).join(", ");
  const services = [
    quote.project.requires_site_survey && "Site survey",
    quote.project.requires_delivery && "Delivery",
    quote.project.requires_installation && "Installation",
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/account/quotes"
          className="inline-flex items-center gap-1 text-sm hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All quotes
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsAppLink(
              WHATSAPP_NUMBER,
              `Hello Floor Nigeria, I have a question about quote ${quote.reference}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 border border-border px-4 text-sm font-medium transition hover:border-gold hover:text-gold"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Ask about this quote
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="border border-border p-6 md:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
          <div>
            <Logo className="hidden h-8 w-auto print:block" />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold print:mt-6">
              Quotation
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">{quote.reference}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{quoteSummary(quote)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={quote.status} label={quote.status_label} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Requested</dt>
              <dd className="mt-1">{formatDate(quote.submitted_at ?? quote.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Valid until</dt>
              <dd className="mt-1">{quote.valid_until ? formatDate(quote.valid_until) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Preferred install</dt>
              <dd className="mt-1">
                {quote.project.preferred_installation_date
                  ? formatDate(quote.project.preferred_installation_date)
                  : "Flexible"}
              </dd>
            </div>
          </dl>
        </header>

        <dl className="grid gap-4 border-b border-border py-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Site</dt>
            <dd className="mt-1">{location || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Services requested</dt>
            <dd className="mt-1">{services.length ? services.join(" · ") : "Supply only"}</dd>
          </div>
        </dl>

        {items.length > 0 ? (
          <div className="overflow-x-auto py-6">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Quoted items</caption>
              <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="py-3 pr-4 font-normal">
                    Item
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-normal">
                    Quantity
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-normal">
                    Unit price
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border align-top">
                    <td className="py-4 pr-4">
                      {item.product_slug ? (
                        <Link
                          href={`/product/${item.product_slug}`}
                          className="hover:text-gold print:no-underline"
                        >
                          {item.description}
                        </Link>
                      ) : (
                        item.description
                      )}
                      {item.variant_sku && (
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                          SKU {item.variant_sku}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-right font-mono">
                      {number(item.quantity)} {UNIT_LABELS[item.unit] ?? item.unit}
                    </td>
                    <td className="py-4 pr-4 text-right font-mono">
                      {item.unit_price > 0 ? naira(item.unit_price, { kobo: true }) : "—"}
                    </td>
                    <td className="py-4 text-right font-mono">
                      {item.line_total > 0 ? naira(item.line_total, { kobo: true }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            Your consultant is preparing the itemised price for this request. You&apos;ll see each
            product, quantity and price here as soon as it&apos;s ready.
          </p>
        )}

        {isPriced && (
          <dl className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono">{naira(quote.totals.subtotal, { kobo: true })}</dd>
            </div>
            {quote.totals.discount_total > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount included</dt>
                <dd className="font-mono">−{naira(quote.totals.discount_total, { kobo: true })}</dd>
              </div>
            )}
            {quote.totals.tax_total > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT</dt>
                <dd className="font-mono">{naira(quote.totals.tax_total, { kobo: true })}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-mono font-semibold">
                {naira(quote.totals.total, { kobo: true })}
              </dd>
            </div>
          </dl>
        )}

        {quote.notes && (
          <section className="mt-8 border-t border-border pt-6 text-sm">
            <h3 className="text-xs text-muted-foreground">Your notes</h3>
            <p className="mt-2 whitespace-pre-line">{quote.notes}</p>
          </section>
        )}

        <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          Prices are in Nigerian Naira. Quantities include the wastage allowance agreed with your
          consultant. This quotation is subject to the site survey and stock availability.
        </footer>
      </article>
    </div>
  );
}
