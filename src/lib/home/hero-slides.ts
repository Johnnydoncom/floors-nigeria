/**
 * The homepage hero, one slide per thing a visitor comes to us for.
 *
 * Photographs only: the hero is full-bleed, so every image here is at least
 * 1600px wide. Category photos from the API are too small for it and stay in
 * the category tiles further down the page.
 */
export type HeroSlideId = "spc" | "wood" | "projects" | "visualizer";

/**
 * A photograph pre-sized by scripts/home-images.py into
 * public/images/home/<name>-<width>.webp, one file per width.
 */
export type HeroImage = { name: string; widths: number[]; alt: string };

const HERO_WIDTHS = [768, 1280, 1920];

/** `srcset` for a pre-sized hero photograph. */
export function heroSrcSet({ name, widths }: Pick<HeroImage, "name" | "widths">): string {
  return widths.map((width) => `${heroSrc(name, width)} ${width}w`).join(", ");
}

/** The fallback `src`: the middle width, sharp enough for most laptops. */
export function heroFallbackSrc({ name, widths }: Pick<HeroImage, "name" | "widths">): string {
  return heroSrc(name, widths[Math.min(1, widths.length - 1)]);
}

function heroSrc(name: string, width: number): string {
  return `/images/home/${name}-${width}.webp`;
}

export type HeroSlide = {
  id: HeroSlideId;
  /** The tab label under the hero. */
  label: string;
  title: string;
  copy: string;
  image: HeroImage & { position?: string };
  /** A second image wiped over the first — the visualizer's before/after. */
  after?: HeroImage;
  /** Flip the photographs, to put the part that changes away from the copy. */
  mirror?: boolean;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** The line under the tab until a live figure (a price, a total) replaces it. */
  hint: string;
  /** Categories whose cheapest product gives the slide's "from" price. */
  priceFrom?: string[];
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "spc",
    hint: "100% waterproof rigid core",
    label: "SPC & vinyl",
    title: "Waterproof floors for busy Nigerian homes",
    copy: "Rigid-core SPC and vinyl planks that take spills, daily mopping and rainy-season humidity in their stride.",
    image: {
      name: "hero-living",
      widths: HERO_WIDTHS,
      alt: "Lounge with wide wood-look planks, carved wooden figures and a sculptural armchair",
      position: "60% 60%",
    },
    primary: { label: "Shop SPC & vinyl", href: "/products/vinyl-flooring" },
    secondary: { label: "Book a free site survey", href: "/contact?enquiry=survey" },
    priceFrom: ["vinyl-flooring", "rigid-vinyl-floor-spc-flooring"],
  },
  {
    id: "wood",
    hint: "Engineered, parquet and laminate",
    label: "Wood & laminate",
    title: "Real timber, or the look of it for less",
    copy: "Engineered oak, herringbone parquet and scratch-resistant laminate in warm, natural tones.",
    image: {
      name: "hero-wood",
      widths: HERO_WIDTHS,
      alt: "Herringbone oak floor in a penthouse at dusk",
      position: "50% 70%",
    },
    primary: { label: "Shop wood flooring", href: "/products/real-wood-flooring" },
    secondary: { label: "Shop laminate", href: "/products/laminate-flooring" },
    priceFrom: ["real-wood-flooring", "laminate-flooring"],
  },
  {
    id: "projects",
    hint: "Specified, supplied and installed",
    label: "Hotels & offices",
    // Replaced with the names of real reference projects when the API has them.
    title: "Floors for hotels, offices and hospitals across Nigeria",
    copy: "Specification, supply and installation by our own crews, from one boardroom to a whole tower.",
    image: {
      name: "hero-hotel",
      widths: [768, 1280, 1600],
      alt: "Hotel lobby with polished herringbone wood flooring",
      position: "50% 65%",
    },
    primary: { label: "See our projects", href: "/projects" },
    secondary: { label: "Open a trade account", href: "/contact?enquiry=trade" },
  },
  {
    id: "visualizer",
    hint: "Any floor, in any room",
    label: "Room visualizer",
    title: "See the floor in your room before you buy",
    copy: "Use a photo of your room or one of ours, then swap floors, wall colours and lighting in seconds.",
    image: {
      name: "hero-visualizer-before",
      widths: HERO_WIDTHS,
      alt: "Family lounge with a mid-brown wood floor",
      position: "50% 60%",
    },
    after: {
      name: "hero-visualizer-after",
      widths: HERO_WIDTHS,
      alt: "The same lounge in the visualizer, laid with light honey oak",
    },
    // The open floor is on the room's left, under the copy; mirrored, it is
    // where the before/after line sweeps.
    mirror: true,
    primary: { label: "Try the visualizer", href: "/visualizer" },
    secondary: { label: "Find my floor", href: "/floor-finder" },
  },
];

/** How long each slide stays before the next is laid, in milliseconds. */
export const HERO_INTERVAL = 7000;
