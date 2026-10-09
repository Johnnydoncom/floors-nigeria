"use client";

import Link from "next/link";
import { ExternalLink, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staffSignOut } from "@/app/admin/actions";

export function UserMenu({ name, email, roles }: { name: string; email: string; roles: string[] }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background pl-1 pr-3 text-sm hover:bg-muted">
        <span className="grid h-7 w-7 place-items-center rounded bg-charcoal-dark text-[11px] font-semibold text-primary-foreground">
          {initials || <UserRound className="h-3.5 w-3.5" aria-hidden />}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{roles.join(", ")}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank" rel="noopener">
            <ExternalLink className="h-4 w-4" aria-hidden /> View the website
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings">
            <UserRound className="h-4 w-4" aria-hidden /> My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={staffSignOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-destructive">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
