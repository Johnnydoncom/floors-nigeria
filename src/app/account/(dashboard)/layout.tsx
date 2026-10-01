import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { stateLabel } from "@/lib/nigeria";
import { AccountNav, AccountNavFallback } from "@/components/account/AccountNav";
import { VerifyEmailBanner } from "@/components/account/VerifyEmailBanner";

/**
 * The signed-in account area (§14).
 *
 * `proxy.ts` turns away visitors with no session cookie before anything
 * renders; this layout makes the authoritative check against the API, so an
 * expired or revoked token also ends up at sign-in.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-24 pt-header print:pb-0 print:pt-0">
      <Suspense fallback={<AccountHeroSkeleton />}>
        <AccountHero />
      </Suspense>

      <div className="container-fluid grid gap-8 pt-10 lg:grid-cols-12 print:block print:pt-0">
        {/* min-w-0: the nav scrolls sideways on phones and must not widen the page. */}
        <aside className="min-w-0 lg:col-span-3 print:hidden">
          <div className="lg:sticky lg:top-28">
            <Suspense fallback={<AccountNavFallback />}>
              <AccountNav />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

async function AccountHero() {
  const user = await getCurrentUser();

  if (!user) redirect("/account/login?expired=1");

  const profile = user.customer_profile;
  const firstName = user.name.trim().split(/\s+/)[0];
  const place = [profile?.city, profile?.state ? stateLabel(profile.state) : null]
    .filter(Boolean)
    .join(", ");
  const memberSince = user.created_at ? new Date(user.created_at).getFullYear() : null;
  const details = [
    profile?.customer_type_label,
    place,
    memberSince ? `Member since ${memberSince}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="bg-charcoal-dark text-primary-foreground print:hidden">
        <div className="container-fluid flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center bg-gold font-display text-xl text-charcoal-dark"
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl tracking-tight md:text-3xl">
                Welcome back, {firstName}
              </h1>
              {details && <p className="truncate text-sm text-primary-foreground/60">{details}</p>}
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex h-11 shrink-0 items-center justify-center self-start bg-gold px-5 sm:self-auto text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-dark transition hover:bg-primary-foreground"
          >
            Browse floors
          </Link>
        </div>
      </div>
      {!user.email_verified_at && (
        <div className="container-fluid pt-6 print:hidden">
          <VerifyEmailBanner email={user.email} />
        </div>
      )}
    </>
  );
}

function AccountHeroSkeleton() {
  return (
    <div className="bg-charcoal-dark print:hidden" aria-hidden>
      <div className="container-fluid flex items-center gap-4 py-10">
        <div className="h-14 w-14 animate-pulse bg-primary-foreground/10" />
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse bg-primary-foreground/10" />
          <div className="h-4 w-40 animate-pulse bg-primary-foreground/10" />
        </div>
      </div>
    </div>
  );
}
