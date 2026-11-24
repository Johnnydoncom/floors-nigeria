import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A homepage section's heading: left-aligned, with an optional way onward. */
export function SectionHeader({
  title,
  lead,
  action,
  tone = "light",
  className,
  id,
}: {
  title: string;
  lead?: string;
  action?: { label: string; href: string };
  tone?: "light" | "dark";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-4", className)}>
      <div className="max-w-2xl">
        <h2
          id={id}
          className="text-balance font-display text-[1.9rem] leading-[1.1] tracking-[-0.02em] md:text-[2.6rem]"
        >
          {title}
        </h2>
        {lead && (
          <p
            className={cn(
              "mt-3 max-w-xl text-pretty leading-relaxed md:text-lg",
              tone === "dark" ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {lead}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex items-center gap-2 font-display text-sm font-semibold underline-offset-4 hover:underline",
            tone === "dark" ? "text-gold-light" : "text-foreground",
          )}
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
