import Link from "next/link";

export default function QuoteNotFound() {
  return (
    <div className="border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-lg">We couldn&apos;t find that quote</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        It may belong to a different account, or the reference may be mistyped.
      </p>
      <Link href="/account/quotes" className="mt-6 inline-flex text-sm font-medium hover:text-gold">
        Back to your quotes
      </Link>
    </div>
  );
}
