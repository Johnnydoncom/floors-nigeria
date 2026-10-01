import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { firstParam, safeRedirectPath, type SearchParams } from "@/lib/account/form-state";
import { RegisterForm } from "@/components/account/AuthForms";
import { AuthHeading } from "@/components/account/AuthPage";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeRedirectPath(firstParam(params.next));

  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <AuthHeading eyebrow="Account" title="Create your account">
        Already registered?{" "}
        <Link
          href={
            next === "/account"
              ? "/account/login"
              : `/account/login?next=${encodeURIComponent(next)}`
          }
          className="font-semibold text-foreground underline-offset-4 hover:text-gold hover:underline"
        >
          Sign in
        </Link>
      </AuthHeading>
      <RegisterForm next={next} />
      <p className="mt-6 text-xs text-muted-foreground">
        Anything you saved before signing up on this device — visualisations and calculations —
        moves into your account. Quotes you requested earlier with the same email appear once you
        confirm the address.
      </p>
    </>
  );
}
