import type { SpecificationGroup } from "@/lib/api/types";

/**
 * Structured specification sections (§9). Rendered as description lists so the
 * label/value relationship survives for assistive technology.
 */
export function ProductSpecifications({ groups }: { groups: SpecificationGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="container-fluid border-t border-border py-14">
      <h2 className="font-display text-2xl tracking-tight">Specifications</h2>

      <div className="mt-8 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.group}>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {group.group}
            </h3>
            <dl className="mt-4">
              {group.items.map((item) => (
                <div
                  key={`${group.group}-${item.label}`}
                  className="flex justify-between gap-6 border-b border-border py-3 text-sm"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="text-right font-medium">
                    {item.value ?? "—"}
                    {item.unit && item.value ? ` ${item.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
