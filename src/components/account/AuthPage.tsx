import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="mb-6 flex items-start gap-3 border border-gold/40 bg-gold/10 p-4 text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-hidden className="w-full">
      <div className="h-3 w-24 animate-pulse bg-muted" />
      <div className="mt-4 h-9 w-2/3 animate-pulse bg-muted" />
      <div className="mt-10 space-y-6">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index}>
            <div className="h-3 w-28 animate-pulse bg-muted" />
            <div className="mt-2 h-12 animate-pulse bg-muted/60" />
          </div>
        ))}
        <div className="h-12 animate-pulse bg-muted" />
      </div>
    </div>
  );
}
