import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "./client";
import { getCategories, getCollections, getTaxonomies } from "./catalog";
import type { Category, Collection, Taxonomy } from "./types";

/**
 * The navigation model behind the header (§5, §6).
 *
 * Built from live catalogue data, so adding a category in the admin puts it in
 * the menu — no code change, which is what §5 means by "configurable from the
 * admin".
 */
export type NavigationData = {
  categories: Category[];
  collections: Collection[];
  rooms: Taxonomy[];
  looks: Taxonomy[];
};

export async function getNavigation(): Promise<NavigationData> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.categories, CacheTags.collections, CacheTags.taxonomies);

  // A catalogue outage should not take the whole site's chrome down with it.
  const [categories, collections, rooms, looks] = await Promise.all([
    getCategories().catch(() => []),
    getCollections(true).catch(() => []),
    getTaxonomies("room").catch(() => []),
    getTaxonomies("look").catch(() => []),
  ]);

  return { categories, collections, rooms, looks };
}
