import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { firstParam, safeRedirectPath, type SearchParams } from "@/lib/account/form-state";
import { LoginForm } from "@/components/account/AuthForms";
import { AuthHeading, AuthNotice } from "@/components/account/AuthPage";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeRedirectPath(firstParam(params.next));

  // Already signed in with a working session: go straight on.
  if (await getCurrentUser()) redirect(next);

  const notice = params.expired
    ? "Your session has ended. Please sign in again."
    : params.reset
      ? "Your password has been reset. Sign in with your new password."
      : params.signed_out
        ? "You've been signed out."
        : null;

  return (
    <>
      <AuthHeading eyebrow="Account" title="Welcome back">
        New to Floors NG?{" "}
        <Link
          href={
            next === "/account"
              ? "/account/register"
              : `/account/register?next=${encodeURIComponent(next)}`
          }
          className="font-semibold text-foreground underline-offset-4 hover:text-gold hover:underline"
        >
          Create an account
        </Link>
      </AuthHeading>
      {notice && <AuthNotice>{notice}</AuthNotice>}
      <LoginForm next={next} />
    </>
  );
}
