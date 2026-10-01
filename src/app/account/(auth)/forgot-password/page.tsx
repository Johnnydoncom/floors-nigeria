import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account/AuthForms";
import { AuthHeading } from "@/components/account/AuthPage";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading eyebrow="Account" title="Reset your password">
        Enter the email address on your account and we&apos;ll send you a link to choose a new
        password.
      </AuthHeading>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/account/login"
          className="font-semibold text-foreground underline-offset-4 hover:text-gold hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
