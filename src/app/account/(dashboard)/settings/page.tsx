import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { DetailsForm, PasswordForm, PreferencesForm } from "@/components/account/SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/account/login?expired=1");

  return (
    <div className="space-y-8">
      <DetailsForm user={user} />
      <PreferencesForm user={user} />
      <PasswordForm />
    </div>
  );
}
