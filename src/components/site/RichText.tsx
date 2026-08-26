import { cn } from "@/lib/utils";

/** A short line with no terminal punctuation reads as a heading, not a sentence. */
const HEADING_MAX_LENGTH = 90;

/**
 * Renders imported store copy.
 *
 * The importer keeps paragraph breaks but strips all markup, so nothing here
 * is ever dangerouslySetInnerHTML. Lines that were headings upstream lost
 * their tags, so they are detected by shape — short, and not a sentence — and
 * given back their visual weight.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .split(/(?:\r?\n){2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, index) =>
        isHeading(block) ? (
          <h3
            key={index}
            className="pt-2 font-display text-lg tracking-tight text-foreground first:pt-0"
          >
            {block}
          </h3>
        ) : (
          <p key={index} className="text-muted-foreground">
            {block}
          </p>
        ),
      )}
    </div>
  );
}

function isHeading(block: string): boolean {
  return block.length <= HEADING_MAX_LENGTH && !/[.!?:]$/.test(block);
}
