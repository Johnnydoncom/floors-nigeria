import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/api/admin";
import { getToken } from "@/lib/api/auth";
import { first } from "@/components/admin/ui";
import { StaffLoginForm } from "@/components/admin/StaffLoginForm";
import { Logo } from "@/components/site/Logo";
import type { SearchParams } from "@/lib/account/form-state";
import { workspacePath } from "../actions";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

/**
 * The staff workspace's own sign-in, apart from the customer account pages:
 * it only admits active staff, and lands them back where they were heading.
 */
export default function StaffLoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden flex-col justify-between bg-charcoal-dark p-10 text-primary-foreground lg:flex">
        <Logo className="h-8 w-auto self-start" invert />
        <div>
          <p className="eyebrow">Floor Nigeria</p>
          <h1 className="mt-3 max-w-md font-display text-4xl leading-tight tracking-tight">
            The workspace for sales, operations and the catalogue.
          </h1>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/65">
            Quotes, the pipeline, site surveys, installations and every product — in one place,
            scoped to your role.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/45">
          For Floor Nigeria staff only. Activity in the workspace is recorded.
        </p>
      </aside>

      <main id="main" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo className="h-8 w-auto" />
          </Link>
          <p className="eyebrow">Staff workspace</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the work email your administrator set up for you.
          </p>

          <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />}>
            <SignIn searchParams={searchParams} />
          </Suspense>

          <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
            Shopping with us?{" "}
            <Link
              href="/account/login"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Sign in to your customer account
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

async function SignIn({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const next = await workspacePath(first(query.next));

  // Already signed in as staff: straight through.
  if ((await getToken()) && first(query.expired) !== "1") {
    const session = await getAdminSession().catch(() => null);
    if (session) redirect(next);
  }

  const notice =
    first(query.signed_out) === "1"
      ? { icon: CheckCircle2, text: "You've signed out of the workspace." }
      : first(query.expired) === "1"
        ? { icon: Clock, text: "Your session ended. Sign in again to carry on." }
        : first(query.denied) === "1"
          ? {
              icon: ShieldCheck,
              text: "That account isn't a staff account. Sign in with your work email.",
            }
          : null;

  return (
    <div className="mt-8 space-y-5">
      {notice && (
        <p
          className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
          role="status"
        >
          <notice.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> {notice.text}
        </p>
      )}
      <StaffLoginForm next={next} />
    </div>
  );
}
