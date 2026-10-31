/**
 * What frames the room tools (§10, §11). The tool is the page, so it opens at
 * the top of it: a single line says what this is, and the explanation waits
 * below for anyone who wants it, where search engines can still read it.
 */

export function ToolHeading({ title, summary }: { title: string; summary: string }) {
  return (
    <header className="container-fluid pt-3 lg:pt-5">
      <h1 className="font-display text-base font-semibold tracking-tight sm:text-xl">{title}</h1>
      <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{summary}</p>
    </header>
  );
}

export function ToolGuide({
  eyebrow,
  title,
  description,
  steps,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: { icon: React.ReactNode; title: string; detail: string }[];
}) {
  return (
    <section className="border-t border-border bg-surface">
      <div className="container-fluid py-10 lg:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 max-w-3xl text-balance font-display text-2xl tracking-tight md:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{description}</p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title} className="rounded-lg border border-border bg-background p-4">
              <p className="flex items-center gap-2 font-display text-sm font-semibold">
                <span className="text-gold">{step.icon}</span>
                {step.title}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
