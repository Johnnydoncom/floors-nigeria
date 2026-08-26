import { RichText } from "@/components/site/RichText";

/** Paragraphs shown before the copy is collapsed behind a disclosure. */
const VISIBLE_BLOCKS = 2;

/**
 * Category copy, placed under the products.
 *
 * This text is written for search engines as much as for shoppers, so it has
 * to be on the page — but several hundred words above the grid buries the
 * products. Here it sits at the end of the page, opening with a couple of
 * paragraphs and folding the rest into a native disclosure, which needs no
 * JavaScript and is keyboard accessible by default (§18, §29).
 */
export function CategoryDescription({ title, text }: { title: string; text?: string | null }) {
  const blocks = (text ?? "")
    .split(/(?:\r?\n){2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  const opening = blocks.slice(0, VISIBLE_BLOCKS).join("\n\n");
  const remainder = blocks.slice(VISIBLE_BLOCKS).join("\n\n");

  return (
    <section className="border-t border-border bg-surface">
      <div className="container-fluid py-14">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl tracking-tight">About {title}</h2>

          <RichText text={opening} className="mt-6" />

          {remainder && (
            <details className="group mt-4">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-gold transition hover:text-charcoal-dark">
                <span className="group-open:hidden">Read more</span>
                <span className="hidden group-open:inline">Show less</span>
                <span aria-hidden className="transition-transform group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <RichText text={remainder} className="mt-6" />
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
