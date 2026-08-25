import { Download } from "lucide-react";
import type { ProductDocument } from "@/lib/api/types";

const KILOBYTE = 1024;

/**
 * Downloadable technical documents (§9): datasheets, installation and warranty.
 */
export function ProductDocuments({ documents }: { documents: ProductDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <section className="container-fluid border-t border-border py-14">
      <h2 className="font-display text-2xl tracking-tight">Downloads</h2>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <li key={document.id}>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 border border-border p-4 transition hover:border-gold hover:text-gold"
            >
              <span>
                <span className="block text-sm font-medium">{document.title}</span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {document.type_label}
                  {document.size_bytes ? ` · ${formatSize(document.size_bytes)}` : ""}
                </span>
              </span>
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatSize(bytes: number): string {
  const megabytes = bytes / (KILOBYTE * KILOBYTE);
  return megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.round(bytes / KILOBYTE)} KB`;
}
