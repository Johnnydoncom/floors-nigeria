"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { CheckoutConfig, CheckoutSummary, PricedCart } from "@/lib/api/types";

export type SummaryOptions = {
  fulfilment?: "delivery" | "pickup";
  state?: string;
  requiresInstallation?: boolean;
};

/**
 * Prices the browser cart on the server whenever it, or the delivery choices,
 * change — debounced so typing a quantity sends one request. The cart's own
 * display prices are brought in line with the result.
 */
export function useCartSummary({ fulfilment, state, requiresInstallation }: SummaryOptions = {}) {
  const cart = useCart();
  // Read through a ref: the cart hands out a new `sync` whenever it changes,
  // and a price update must not trigger another pricing request.
  const sync = useRef(cart.sync);
  const [summary, setSummary] = useState<PricedCart | null>(null);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    sync.current = cart.sync;
  }, [cart.sync]);

  const items = useMemo(
    () => cart.items.map((item) => ({ variant_id: item.variantId, quantity: item.qty })),
    [cart.items],
  );
  const key = JSON.stringify({ items, fulfilment, state, requiresInstallation });

  useEffect(() => {
    if (!cart.ready) return;

    if (items.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- an empty cart needs no request
      setSummary(null);
      return;
    }

    const id = ++request.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/checkout/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            items,
            fulfilment,
            state: state || undefined,
            requires_installation: requiresInstallation ?? false,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as CheckoutSummary & { message?: string };

        if (id !== request.current) return;

        if (!response.ok) {
          setError(payload.message ?? "We could not price your cart. Please try again.");
          return;
        }

        setSummary(payload.data);
        setConfig(payload.config);
        setError(null);
        sync.current(
          payload.data.lines
            .filter((line) => line.issue === null)
            .map((line) => ({
              variantId: line.variant_id,
              price: line.unit_price,
              img: line.image_url,
            })),
        );
      } catch (caught) {
        if ((caught as Error).name !== "AbortError" && id === request.current) {
          setError("We could not reach our store. Check your connection and try again.");
        }
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` captures every input; `items` and friends are read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cart.ready]);

  return { summary, config, error, loading };
}
