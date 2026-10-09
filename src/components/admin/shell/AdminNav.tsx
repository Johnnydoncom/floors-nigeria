"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  FileText,
  Files,
  FolderKanban,
  GalleryHorizontalEnd,
  Hammer,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Menu,
  Ruler,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Star,
  SwatchBook,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";
import type { NavGroup, NavIcon } from "@/lib/admin/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  pipeline: Columns3,
  leads: Inbox,
  quotes: FileText,
  customers: Users,
  companies: Building2,
  tasks: ListChecks,
  appointments: CalendarDays,
  surveys: Ruler,
  projects: FolderKanban,
  installations: Hammer,
  products: Boxes,
  categories: Tags,
  attributes: SwatchBook,
  brands: ClipboardList,
  taxonomies: Sofa,
  reviews: Star,
  textures: ImageIcon,
  orders: ShoppingBag,
  pages: Files,
  posts: BookOpen,
  portfolio: GalleryHorizontalEnd,
  reports: BarChart3,
  staff: ShieldCheck,
  settings: Settings,
  audit: ScrollText,
};

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Workspace" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active
                        ? "bg-primary-foreground/12 font-medium text-primary-foreground"
                        : "text-primary-foreground/70 hover:bg-primary-foreground/6 hover:text-primary-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-gold")} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The fixed sidebar on large screens. */
export function AdminSidebar({ groups }: { groups: NavGroup[] }) {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-charcoal-dark px-3 py-5 text-primary-foreground lg:flex">
      <Link href="/admin" className="mb-6 flex items-center gap-2 px-3">
        <Logo className="h-7 w-auto" invert />
        <span className="sr-only">Workspace home</span>
      </Link>
      <NavLinks groups={groups} />
    </aside>
  );
}

/** The same navigation in a drawer on smaller screens. */
export function AdminMobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 overflow-y-auto border-0 bg-charcoal-dark p-4 text-primary-foreground"
      >
        <SheetTitle className="mb-5 px-3">
          <Logo className="h-7 w-auto" invert />
        </SheetTitle>
        <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
