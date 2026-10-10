"use client";

import { CatalogError } from "@/components/catalog/CatalogError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CatalogError error={error} reset={reset} />;
}
