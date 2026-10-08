"use client";

import { useSyncExternalStore } from "react";
import type { TextureChoice } from "./types";

/**
 * The visitor's own shortlist in the visualizer: favourite floors, floors
 * recently tried, and designs saved to a share link.
 *
 * Kept in this browser so it works without an account — most visitors never
 * sign in before they have chosen a floor. Favourites are also sent to the
 * account when there is one (see `useFavoriteToggle`), where they appear in
 * Saved alongside the product page's Save button.
 */

export type SavedDesign = {
  token: string;
  url: string;
  imageUrl: string | null;
  productName: string | null;
  savedAt: string;
};

type Library = {
  favorites: TextureChoice[];
  recent: TextureChoice[];
  designs: SavedDesign[];
};

const KEY = "floorsng.visualizer.library.v1";
const RECENT_LIMIT = 12;
const FAVORITE_LIMIT = 60;
const DESIGN_LIMIT = 24;

const EMPTY: Library = { favorites: [], recent: [], designs: [] };

let snapshot: Library | null = null;
const listeners = new Set<() => void>();

function read(): Library {
  if (snapshot) return snapshot;

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Library>) : {};
    snapshot = {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      designs: Array.isArray(parsed.designs) ? parsed.designs : [],
    };
  } catch {
    snapshot = EMPTY;
  }

  return snapshot;
}

function write(next: Library): void {
  snapshot = next;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the list still works for this visit.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab changed the list.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    snapshot = null;
    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function materialKey(
  choice: Pick<TextureChoice, "productSlug" | "variantId" | "variantName">,
): string {
  return `${choice.productSlug}::${choice.variantId ?? choice.variantName ?? "base"}`;
}

/** Only what is needed to show and re-select a material, not the whole card. */
function slim(choice: TextureChoice): TextureChoice {
  return { ...choice, variant: choice.variant ? { ...choice.variant, media: undefined } : null };
}

export function useLibrary(): Library {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const library = {
  isFavorite(choice: TextureChoice): boolean {
    const key = materialKey(choice);
    return read().favorites.some((entry) => materialKey(entry) === key);
  },

  /** Whether any colour of this product is still a favourite. */
  hasFavoriteProduct(slug: string): boolean {
    return read().favorites.some((entry) => entry.productSlug === slug);
  },

  /** Returns whether the material is now a favourite. */
  toggleFavorite(choice: TextureChoice): boolean {
    const current = read();
    const key = materialKey(choice);
    const exists = current.favorites.some((entry) => materialKey(entry) === key);

    write({
      ...current,
      favorites: exists
        ? current.favorites.filter((entry) => materialKey(entry) !== key)
        : [slim(choice), ...current.favorites].slice(0, FAVORITE_LIMIT),
    });

    return !exists;
  },

  viewed(choice: TextureChoice): void {
    const current = read();
    const key = materialKey(choice);

    if (
      materialKey(current.recent[0] ?? { productSlug: "", variantId: null, variantName: null }) ===
      key
    ) {
      return;
    }

    write({
      ...current,
      recent: [slim(choice), ...current.recent.filter((entry) => materialKey(entry) !== key)].slice(
        0,
        RECENT_LIMIT,
      ),
    });
  },

  savedDesign(design: SavedDesign): void {
    const current = read();

    write({
      ...current,
      designs: [design, ...current.designs.filter((entry) => entry.token !== design.token)].slice(
        0,
        DESIGN_LIMIT,
      ),
    });
  },

  forgetDesign(token: string): void {
    const current = read();
    write({ ...current, designs: current.designs.filter((entry) => entry.token !== token) });
  },
};
