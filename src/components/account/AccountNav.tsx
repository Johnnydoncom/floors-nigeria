"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Heart, LayoutGrid, LogOut, MapPin, Settings, Truck } from "lucide-react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/account/actions";
import { cn } from "@/lib/utils";

export const ACCOUNT_SECTIONS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account/projects", label: "Orders & projects", icon: Truck },
  { href: "/account/quotes", label: "Quotes", icon: FileText },
  { href: "/account/saved", label: "Saved", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Section navigation with the current section highlighted. */
export function AccountNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The same navigation for the static shell, before the pathname is known. */
export function AccountNavFallback() {
  return <NavLinks pathname={null} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Account"
      className="flex gap-1 overflow-x-auto border border-border bg-surface p-2 lg:flex-col"
    >
      {ACCOUNT_SECTIONS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center gap-3 whitespace-nowrap px-4 text-sm transition",
              active ? "bg-charcoal-dark text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        );
      })}
      <form action={signOut} className="shrink-0 lg:mt-1 lg:border-t lg:border-border lg:pt-1">
        <SignOutButton />
      </form>
    </nav>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center gap-3 whitespace-nowrap px-4 text-sm text-muted-foreground transition hover:text-destructive disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden /> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
