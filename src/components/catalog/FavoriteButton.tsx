"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = { authenticated: boolean; saved: boolean };

/**
 * Save a product to the customer's account (§14). The page is shared and
 * prerendered, so this visitor's saved state is fetched after it loads.
 * Signed-out visitors are taken to sign in and brought back here.
 */
export function FavoriteButton({
  productId,
  productSlug,
  variantId,
}: {
  productId: number;
  productSlug: string;
  variantId?: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/account/favorites?product=${productId}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Status>) : null))
      .then((result) => result && setStatus(result))
      .catch(() => {
        /* Unknown state: the button still works, it just starts unfilled. */
      });

    return () => controller.abort();
  }, [productId]);

  const toggle = async () => {
    if (status && !status.authenticated) {
      toast("Sign in to save products to your account.");
      router.push(`/account/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const saving = !status?.saved;
    setBusy(true);

    try {
      const response = saving
        ? await fetch("/api/account/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, product_variant_id: variantId ?? null }),
          })
        : await fetch(`/api/account/favorites?slug=${encodeURIComponent(productSlug)}`, {
            method: "DELETE",
          });

      if (response.status === 401) {
        setStatus({ authenticated: false, saved: false });
        toast("Sign in to save products to your account.");
        router.push(`/account/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) throw new Error(`Favourite request failed: ${response.status}`);

      setStatus({ authenticated: true, saved: saving });
      toast.success(saving ? "Saved to your account" : "Removed from your saved products", {
        action: saving
          ? { label: "View saved", onClick: () => router.push("/account/saved") }
          : undefined,
      });
    } catch {
      toast.error("We couldn't update your saved products. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saved = status?.saved ?? false;

  return (
    <Button
      variant="ghost"
      className="h-11 rounded-none"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
    >
      <Heart className={cn("h-4 w-4", saved && "fill-gold text-gold")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
