import type { Category } from "@/lib/api/types";

/**
 * How the storefront groups and promotes the catalogue.
 *
 * The imported category tree is alphabetical and every top-level category is
 * flagged featured, so neither order nor `is_featured` says what a visitor is
 * shopping for. This is the merchandising layer: which floors lead the header,
 * how the materials menu is grouped, and which floors suit which room.
 *
 * Everything is keyed by category slug and resolved against the live tree, so
 * a slug that is renamed or removed upstream simply drops out — the site never
 * links to a category that does not exist.
 */

export type FloorFamily = {
  /** Short label for the navigation bar. */
  label: string;
  slug: string;
  /** One line for cards that introduce the family. */
  tagline: string;
  /** Used when the category has no image of its own. */
  fallbackImage: string;
  /**
   * A menu group to open as a dropdown, for families with no single parent
   * category upstream (the carpets are seven separate categories).
   */
  menuGroup?: string;
};

/** The floors that lead the header, in order of demand. */
export const FLOOR_FAMILIES: FloorFamily[] = [
  {
    label: "Vinyl",
    slug: "vinyl-flooring",
    tagline: "Warm, quiet and moisture-tolerant",
    fallbackImage: "/images/collection-spc.jpg",
  },
  {
    label: "SPC",
    slug: "rigid-vinyl-floor-spc-flooring",
    tagline: "Rigid core, 100% waterproof",
    fallbackImage: "/images/collection-spc.jpg",
  },
  {
    label: "Laminate",
    slug: "laminate-flooring",
    tagline: "The look of timber, built for wear",
    fallbackImage: "/images/collection-oak.jpg",
  },
  {
    label: "Wood",
    slug: "real-wood-flooring",
    tagline: "Real and engineered timber",
    fallbackImage: "/images/hero-floor.jpg",
  },
  {
    label: "WPC & Panels",
    slug: "wpc-flooring",
    tagline: "Fluted wall panels and decking",
    fallbackImage: "/images/project-residence.jpg",
  },
  {
    label: "Carpets",
    slug: "wall-to-wall-carpets",
    tagline: "Broadloom and carpet tiles",
    fallbackImage: "/images/project-hotel.jpg",
    menuGroup: "Carpets",
  },
  {
    label: "Epoxy",
    slug: "3d-epoxy-flooring",
    tagline: "Seamless, hard-wearing finishes",
    fallbackImage: "/images/materials-strip.jpg",
  },
  {
    label: "Artificial Grass",
    slug: "artificial-grass",
    tagline: "Lawns, terraces and play areas",
    fallbackImage: "/images/materials-strip.jpg",
  },
  {
    label: "Gym Flooring",
    slug: "rubber-gym-flooring",
    tagline: "Rubber tiles that absorb impact",
    fallbackImage: "/images/project-office.jpg",
  },
  {
    label: "Mats",
    slug: "floor-mats-nigeria",
    tagline: "Entrance, safety and door mats",
    fallbackImage: "/images/project-office.jpg",
  },
];

/**
 * The materials menu, grouped the way a buyer thinks rather than A–Z. Any
 * top-level category not listed here lands in "More", so a new category
 * still appears without a code change.
 */
export const MENU_GROUPS: { title: string; slugs: string[] }[] = [
  {
    title: "Hard flooring",
    slugs: [
      "vinyl-flooring",
      "rigid-vinyl-floor-spc-flooring",
      "luxury-vinyl-tile",
      "laminate-flooring",
      "real-wood-flooring",
      "engineered-wood-flooring",
      "linoleum-flooring",
    ],
  },
  {
    title: "Carpets",
    slugs: [
      "wall-to-wall-carpets",
      "woolen-carpet-tiles-in-nigeria",
      "needle-felt-carpet-tiles",
      "cut-pile-carpet",
      "exhibition-carpet",
      "auto-carpet",
      "gold-mining-carpet",
    ],
  },
  {
    title: "Walls, outdoor & sport",
    slugs: [
      "wpc-flooring",
      "artificial-grass",
      "artificial-grass-wall-panels",
      "rubber-gym-flooring",
      "sports-outdoors",
      "3d-epoxy-flooring",
    ],
  },
  {
    title: "Mats & accessories",
    slugs: [
      "floor-mats-nigeria",
      "accessories",
      "pvc-door-mat",
      "aluminum-doormat-fabric",
      "laminate-molding-skirting-board",
      "spc-moldings",
      "floor-underlays",
    ],
  },
];

/** Floors that suit each room, for room pages and the homepage. */
export const ROOM_FLOORS: Record<string, string[]> = {
  "living-room": [
    "laminate-flooring",
    "real-wood-flooring",
    "rigid-vinyl-floor-spc-flooring",
    "wall-to-wall-carpets",
  ],
  bedroom: ["laminate-flooring", "wall-to-wall-carpets", "real-wood-flooring", "vinyl-flooring"],
  kitchen: ["rigid-vinyl-floor-spc-flooring", "vinyl-flooring", "3d-epoxy-flooring"],
  bathroom: ["rigid-vinyl-floor-spc-flooring", "vinyl-flooring", "floor-mats-nigeria"],
  office: [
    "needle-felt-carpet-tiles",
    "woolen-carpet-tiles-in-nigeria",
    "rigid-vinyl-floor-spc-flooring",
    "laminate-flooring",
  ],
  hotel: [
    "wall-to-wall-carpets",
    "woolen-carpet-tiles-in-nigeria",
    "wpc-flooring",
    "laminate-flooring",
  ],
  restaurant: [
    "rigid-vinyl-floor-spc-flooring",
    "vinyl-flooring",
    "3d-epoxy-flooring",
    "floor-mats-nigeria",
  ],
  retail: ["rigid-vinyl-floor-spc-flooring", "3d-epoxy-flooring", "vinyl-flooring"],
  outdoor: ["artificial-grass", "wpc-flooring", "rubber-gym-flooring"],
  showroom: ["3d-epoxy-flooring", "rigid-vinyl-floor-spc-flooring", "laminate-flooring"],
};

export type FloorLink = {
  label: string;
  name: string;
  slug: string;
  href: string;
  tagline: string;
  image: string;
  productCount: number | null;
  /** Set when the family opens a dropdown rather than a single page. */
  children?: { name: string; href: string }[];
};

/** Every category in the tree, children included, keyed by slug. */
export function indexCategories(categories: Category[]): Map<string, Category> {
  const index = new Map<string, Category>();
  const visit = (list: Category[]) => {
    for (const category of list) {
      index.set(category.slug, category);
      visit(category.children ?? []);
    }
  };
  visit(categories);
  return index;
}

/**
 * Category landing pages live under the catalogue: `/products/<category>`.
 * Individual products sit beside them at `/product/<product>`.
 */
export function categoryHref(slug: string): string {
  return `/products/${slug}`;
}

/** The headline floor families that exist in the live catalogue. */
export function resolveFloorFamilies(categories: Category[]): FloorLink[] {
  const index = indexCategories(categories);
  const groups = resolveMenuGroups(categories);

  return FLOOR_FAMILIES.flatMap((family) => {
    const category = index.get(family.slug);
    if (!category) return [];

    return [
      {
        label: family.label,
        name: category.name,
        slug: category.slug,
        href: categoryHref(category.slug),
        tagline: family.tagline,
        image: category.image_url ?? family.fallbackImage,
        productCount: category.products_count ?? null,
        children: family.menuGroup
          ? groups.find((group) => group.title === family.menuGroup)?.links
          : undefined,
      },
    ];
  });
}

export type MenuGroup = { title: string; links: { name: string; href: string }[] };

/** The materials menu, with unlisted top-level categories gathered under "More". */
export function resolveMenuGroups(categories: Category[]): MenuGroup[] {
  const index = indexCategories(categories);
  const placed = new Set(MENU_GROUPS.flatMap((group) => group.slugs));

  const groups = MENU_GROUPS.map((group) => ({
    title: group.title,
    links: group.slugs.flatMap((slug) => {
      const category = index.get(slug);
      return category ? [{ name: category.name, href: categoryHref(slug) }] : [];
    }),
  }));

  const unplaced = categories
    .filter((category) => !placed.has(category.slug))
    .map((category) => ({ name: category.name, href: categoryHref(category.slug) }));

  if (unplaced.length > 0) groups.push({ title: "More", links: unplaced });

  return groups.filter((group) => group.links.length > 0);
}

/** Categories that suit a room, in recommendation order. */
export function floorsForRoom(roomSlug: string, categories: Category[]): Category[] {
  const index = indexCategories(categories);
  return (ROOM_FLOORS[roomSlug] ?? []).flatMap((slug) => {
    const category = index.get(slug);
    return category ? [category] : [];
  });
}
