import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <section className="container-fluid grid min-h-[60vh] place-items-center py-24 text-center">
      <div className="max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">Not found</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
          This product is no longer listed.
        </h1>
        <p className="mt-4 text-muted-foreground">
          It may have been discontinued or renamed. Browse the catalogue, or ask a consultant for a
          direct replacement.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-none">
            <Link href="/products">Browse the catalogue</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none">
            <Link href="/contact">Talk to a consultant</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
