import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getQuotes } from "@/lib/api/account";
import { firstParam, type SearchParams } from "@/lib/account/form-state";
import { EmptyState, QuoteRow, SectionHeading } from "@/components/account/display";

export const metadata: Metadata = { title: "Your quotes" };

export default async function QuotesPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = Number(firstParam((await searchParams).page) ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const { data: quotes, meta } = await getQuotes(page);

  return (
    <section>
      <SectionHeading
        title="Quotes"
        description="Every quote you've requested, and where it is. Open one to see the priced items or print it."
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          action={{ href: "/contact", label: "Talk to a consultant" }}
        >
          Request a quote and it appears here while our team measures and prices it. Quotes you sent
          before registering appear once you confirm your email address.
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-border border border-border">
            {quotes.map((quote) => (
              <QuoteRow key={quote.id} quote={quote} />
            ))}
          </ul>

          {meta.last_page > 1 && (
            <nav
              aria-label="Quote pages"
              className="mt-6 flex items-center justify-between text-sm"
            >
              {meta.current_page > 1 ? (
                <Link
                  href={`/account/quotes?page=${meta.current_page - 1}`}
                  className="hover:text-gold"
                >
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Page {meta.current_page} of {meta.last_page}
              </span>
              {meta.current_page < meta.last_page ? (
                <Link
                  href={`/account/quotes?page=${meta.current_page + 1}`}
                  className="hover:text-gold"
                >
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
