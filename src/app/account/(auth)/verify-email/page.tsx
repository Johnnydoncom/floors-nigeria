import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getCurrentUser, verifyEmail } from "@/lib/api/auth";
import { firstParam, type SearchParams } from "@/lib/account/form-state";
import { AuthHeading } from "@/components/account/AuthPage";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const linkClass =
  "inline-flex h-12 items-center bg-charcoal-dark px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark";

/**
 * Opened from the verification email. Confirming is idempotent and harmless
 * to repeat, so it happens on arrival rather than behind another click.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const link = {
    id: firstParam(params.id) ?? "",
    hash: firstParam(params.hash) ?? "",
    expires: firstParam(params.expires) ?? "",
    signature: firstParam(params.signature) ?? "",
  };

  const isComplete = Object.values(link).every(Boolean);
  const verified = isComplete && (await verifyEmail(link));
  const signedIn = (await getCurrentUser()) !== null;

  if (!verified) {
    return (
      <>
        <XCircle className="mb-6 h-8 w-8 text-destructive" aria-hidden />
        <AuthHeading eyebrow="Email confirmation" title="This link has expired or is invalid">
          Confirmation links expire an hour after they are sent.{" "}
          {signedIn
            ? "You can send yourself a new one from your account settings."
            : "Sign in and send yourself a new one from your account settings."}
        </AuthHeading>
        <Link
          href={signedIn ? "/account/settings" : "/account/login?next=/account/settings"}
          className={linkClass}
        >
          {signedIn ? "Go to settings" : "Sign in"}
        </Link>
      </>
    );
  }

  return (
    <>
      <CheckCircle2 className="mb-6 h-8 w-8 text-emerald-600" aria-hidden />
      <AuthHeading eyebrow="Email confirmation" title="Your email is confirmed">
        Thank you. Any quotes you requested earlier with this address are now in your account.
      </AuthHeading>
      <Link href={signedIn ? "/account" : "/account/login"} className={linkClass}>
        {signedIn ? "Go to your account" : "Sign in"}
      </Link>
    </>
  );
}
