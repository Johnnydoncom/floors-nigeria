import Link from "next/link";
import { staffSignOut } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/api/admin";
import { getCurrentUser } from "@/lib/api/auth";
import { navFor } from "@/lib/admin/nav";
import { AdminMobileNav, AdminSidebar } from "./AdminNav";
import { NotificationsBell } from "./NotificationsBell";
import { UserMenu } from "./UserMenu";

/**
 * The workspace frame: navigation filtered to the signed-in role, the
 * notification bell and the account menu. Anyone signed in without a staff
 * role sees a polite dead end instead.
 */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    const user = await getCurrentUser();

    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4">
        <div className="max-w-md rounded-lg border border-border bg-background p-8 text-center">
          <p className="eyebrow">Staff workspace</p>
          <h1 className="mt-3 font-display text-2xl">This area is for the Floor Nigeria team</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {user
              ? `You're signed in as ${user.email}, which isn't a staff account.`
              : "Your account isn't a staff account."}{" "}
            If you work with us, ask an administrator to give your account a role.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <form action={staffSignOut}>
              <button type="submit" className="btn btn-primary">
                Sign in with a staff account
              </button>
            </form>
            <Link href="/account" className="btn btn-outline">
              Your customer account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const groups = navFor(session.permissions);

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <AdminSidebar groups={groups} />
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <AdminMobileNav groups={groups} />
            <p className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Floor Nigeria · </span>Workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell initialUnread={session.unread_notifications} />
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              roles={session.user.roles.map((role) => role.label)}
            />
          </div>
        </header>
        <main id="main" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_minmax(0,1fr)]" aria-busy>
      <div className="hidden bg-charcoal-dark lg:block" />
      <div>
        <div className="h-14 border-b border-border bg-background" />
        <div className="space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
