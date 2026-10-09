"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { adminRequest } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import type { AdminNotification } from "@/lib/admin/types";

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

/**
 * New quote requests and work assigned to you (§25). Loaded when opened, so
 * the bell costs nothing on pages where nobody looks at it.
 */
export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<AdminNotification[] | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await adminRequest<{ data: AdminNotification[]; meta: { unread: number } }>(
        "GET",
        "notifications",
      );
      setItems(response.data);
      setUnread(response.meta.unread);
    } catch {
      setItems([]);
    }
  }, []);

  async function markAllRead() {
    await adminRequest("POST", "notifications/read").catch(() => undefined);
    setUnread(0);
    setItems(
      (current) =>
        current?.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })) ??
        null,
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <PopoverTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {items === null && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</li>
          )}
          {items?.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing new.</li>
          )}
          {items?.map((item) => (
            <li key={item.id} className="border-b border-border last:border-0">
              <Link
                href={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-3 text-sm hover:bg-muted",
                  !item.read_at && "bg-gold/8",
                )}
              >
                <p className={cn("leading-snug", !item.read_at && "font-medium")}>{item.title}</p>
                {item.body && <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>}
                {item.created_at && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {timeFormatter.format(new Date(item.created_at))}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
