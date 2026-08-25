"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  slug: string;
  name: string;
  img: string;
  finish: string;
  price: number; // per m2
  qty: number; // m2
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  remove: (slug: string, finish: string) => void;
  setQty: (slug: string, finish: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "floorsng.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const same = (i: CartItem, slug: string, finish: string) => i.slug === slug && i.finish === finish;
    return {
      items,
      open,
      setOpen,
      count: items.reduce((n, _i) => n + 1, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.qty, 0),
      add: (item) =>
        setItems((prev) => {
          const idx = prev.findIndex((i) => same(i, item.slug, item.finish));
          if (idx === -1) return [...prev, item];
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
          return next;
        }),
      remove: (slug, finish) => setItems((prev) => prev.filter((i) => !same(i, slug, finish))),
      setQty: (slug, finish, qty) =>
        setItems((prev) => prev.map((i) => (same(i, slug, finish) ? { ...i, qty: Math.max(1, qty) } : i))),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
