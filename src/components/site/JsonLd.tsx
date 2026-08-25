/**
 * Renders a schema.org block. Server component — the JSON is inlined into the
 * prerendered HTML so crawlers see it without running JavaScript.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Payload is built server-side from our own API, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
