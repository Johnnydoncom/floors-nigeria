"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * One line in the browser-held cart. It names a variation and a quantity in
 * the variation's selling unit; the price kept here is only for display until
 * the server prices the cart — checkout always charges the server's figure.
 */
export type CartItem = {
  variantId: number;
  /** Product slug, for linking back to the product page. */
  slug: string;
  name: string;
  /** The variation's name: colour, size or finish. */
  variant: string;
  sku?: string | null;
  img: string;
  /** Selling unit code (`sqm`, `pack`…) and its label (`per m²`). */
  unit: string;
  unitLabel: string;
  price: number;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  /** False until the cart has been read from storage after mount. */
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  remove: (variantId: number) => void;
  setQty: (variantId: number, qty: number) => void;
  /** Bring display prices and details in line with what the server charges. */
  sync: (lines: { variantId: number; price: number; img?: string | null }[]) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

/**
 * v2 keys lines by variation. v1 carts (product slug + finish name, no
 * variation id) cannot be priced by the server, so they are not carried over.
 */
const KEY = "floorsng.cart.v2";
const LEGACY_KEY = "floorsng.cart.v1";

/** The step the +/- buttons move a quantity by, per unit. */
export function quantityStep(unit: string): number {
  return unit === "sqm" || unit === "lm" ? 5 : 1;
}

export function unitSymbol(unit: string): string {
  switch (unit) {
    case "sqm":
      return "m²";
    case "lm":
      return "m";
    case "pack":
      return "packs";
    case "box":
      return "boxes";
    case "roll":
      return "rolls";
    default:
      return "pcs";
  }
}

function isCartItem(value: unknown): value is CartItem {
  const item = value as Partial<CartItem> | null;
  return (
    typeof item?.variantId === "number" &&
    typeof item.slug === "string" &&
    typeof item.qty === "number" &&
    item.qty > 0
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  // Hydrate after mount: localStorage does not exist on the server, so reading
  // it during render would desync the server and client trees.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
    // Storage has been read; from here on changes are written back.
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      ready,
      open,
      setOpen,
      count: items.length,
      subtotal: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      add: (item) =>
        setItems((previous) => {
          const index = previous.findIndex((line) => line.variantId === item.variantId);
          if (index === -1) return [...previous, item];
          const next = [...previous];
          next[index] = { ...next[index], ...item, qty: next[index].qty + item.qty };
          return next;
        }),
      remove: (variantId) =>
        setItems((previous) => previous.filter((line) => line.variantId !== variantId)),
      setQty: (variantId, qty) =>
        setItems((previous) =>
          previous.map((line) =>
            line.variantId === variantId
              ? { ...line, qty: Math.max(1, Math.round(qty * 100) / 100) }
              : line,
          ),
        ),
      sync: (lines) =>
        setItems((previous) => {
          let changed = false;
          const next = previous.map((line) => {
            const fresh = lines.find((entry) => entry.variantId === line.variantId);
            if (!fresh) return line;
            const img = fresh.img || line.img;
            if (fresh.price === line.price && img === line.img) return line;
            changed = true;
            return { ...line, price: fresh.price, img };
          });
          return changed ? next : previous;
        }),
      clear: () => setItems([]),
    }),
    [items, open, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
