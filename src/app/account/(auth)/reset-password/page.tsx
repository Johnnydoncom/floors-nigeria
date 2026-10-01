import type { Metadata } from "next";
import Link from "next/link";
import { firstParam, type SearchParams } from "@/lib/account/form-state";
import { ResetPasswordForm } from "@/components/account/AuthForms";
import { AuthHeading } from "@/components/account/AuthPage";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The token in the URL is a credential: never leak it to another origin.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const email = firstParam(params.email);

  if (!token || !email) {
    return (
      <>
        <AuthHeading eyebrow="Account" title="This link is incomplete">
          Password reset links only work exactly as they arrive in the email. Request a fresh one
          and open it directly from your inbox.
        </AuthHeading>
        <Link
          href="/account/forgot-password"
          className="inline-flex h-12 items-center bg-charcoal-dark px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark"
        >
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="Account" title="Choose a new password">
        Signing in again on your other devices will be required afterwards.
      </AuthHeading>
      <ResetPasswordForm token={token} email={email} />
    </>
  );
}
