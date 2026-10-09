import type { Metadata } from "next";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import type { Setting } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  if (!can(session, "settings.view")) return <NoAccess what="settings" />;

  const [{ data: settings }, lookups] = await Promise.all([
    adminGet<{ data: Setting[] }>("settings"),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details, VAT and quote validity, calculator defaults, service areas and the visualizer. Every change is recorded in the audit log."
      />
      <SettingsForm
        settings={settings}
        states={lookups.states}
        editable={can(session, "settings.update")}
      />
    </>
  );
}
