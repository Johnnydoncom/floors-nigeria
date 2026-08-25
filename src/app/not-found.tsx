import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function NotFound() {
  return (
    <>
      <main className="min-h-screen grid place-items-center px-6 pt-32 pb-24">
        <div className="text-center max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">
            Error 404
          </p>
          <h1 className="mt-6 font-display text-6xl md:text-8xl tracking-tight">
            Lost the plan.
          </h1>
          <p className="mt-4 text-muted-foreground">
            The page you&apos;re looking for has been moved, renamed, or never
            existed.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/"
              className="h-11 inline-flex items-center rounded-full bg-charcoal px-6 text-sm font-medium text-primary-foreground hover:bg-charcoal-dark transition"
            >
              Go home
            </Link>
            <Link
              href="/products"
              className="h-11 inline-flex items-center rounded-full border border-border px-6 text-sm font-medium hover:bg-muted transition"
            >
              Browse products
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
