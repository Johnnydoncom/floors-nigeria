import { Suspense } from "react";
import { AdminShell, AdminShellSkeleton } from "@/components/admin/shell/AdminShell";

/**
 * The admin/CRM workspace (§15). `proxy.ts` sends visitors without a session
 * to sign in; the shell then checks with the API that they are staff.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
