import type { Media, Product, Variant } from "@/lib/api/types";

/** A photograph: shown on the stage, magnified on hover, zoomable in the lightbox. */
export type GalleryImageItem = {
  kind: "image";
  id: string;
  /** Display-size rendition for the stage and thumbnails' big brother. */
  url: string;
  /** Highest-resolution source, used for the magnifier and lightbox zoom. */
  zoomUrl: string;
  thumbUrl: string;
  alt: string;
  caption: string | null;
  /** Short role label, e.g. "Room setting" — null for plain product shots. */
  label: string | null;
};

/** An ordered turntable sequence, played as a draggable 360° spin. */
export type GallerySpinItem = {
  kind: "spin";
  id: string;
  frames: string[];
  thumbUrl: string;
  alt: string;
};

/** An equirectangular photograph, viewed as a look-around 360° panorama. */
export type GalleryPanoramaItem = {
  kind: "panorama";
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  caption: string | null;
};

export type GalleryItem = GalleryImageItem | GallerySpinItem | GalleryPanoramaItem;

/** `sizes` for the gallery stage, shared so the lightbox can reuse its cached rendition. */
export const STAGE_SIZES = "(min-width: 1024px) 58vw, 100vw";

/** The fewest frames that still read as rotation rather than a slideshow. */
const MIN_SPIN_FRAMES = 8;

/** Photograph roles in the order the page shows them, with their badges. */
const PHOTO_ROLES: { role: string; label: string | null }[] = [
  { role: "hero", label: null },
  { role: "gallery", label: null },
  { role: "lifestyle", label: "Room setting" },
  { role: "texture", label: "Close-up" },
  { role: "edge_profile", label: "Edge & profile" },
  { role: "installation", label: "Installation" },
];

function photo(media: Media, fallbackAlt: string, label: string | null): GalleryImageItem {
  return {
    kind: "image",
    id: `media-${media.id}`,
    url: media.large_url || media.preview_url || media.url,
    zoomUrl: media.url,
    thumbUrl: media.thumb_url || media.url,
    alt: media.alt || fallbackAlt,
    caption: media.caption,
    label,
  };
}

/**
 * Everything the product gallery can show for the current selection:
 * the variation's own photographs first, then the product's photographs by
 * role, with the 360° spin and panoramas placed straight after the lead image
 * so shoppers find them without scrolling the rail.
 */
export function productGallery(product: Product, variant?: Variant): GalleryItem[] {
  const media = product.media ?? {};

  const photos: GalleryImageItem[] = [
    ...(variant?.media ?? []).map((entry) =>
      photo(entry, `${product.name} — ${variant?.name ?? ""}`, null),
    ),
    ...PHOTO_ROLES.flatMap(({ role, label }) =>
      (media[role] ?? []).map((entry) => photo(entry, product.name, label)),
    ),
  ];

  if (photos.length === 0 && product.image_url) {
    photos.push({
      kind: "image",
      id: "product-image",
      url: product.image_url,
      zoomUrl: product.image_url,
      thumbUrl: product.thumb_url ?? product.image_url,
      alt: product.name,
      caption: null,
      label: null,
    });
  }

  // De-duplicate: the hero often repeats across roles and variations.
  const unique = photos.filter(
    (item, index) => photos.findIndex((entry) => entry.zoomUrl === item.zoomUrl) === index,
  );

  const immersive: GalleryItem[] = [];
  const frames = media.spin ?? [];

  if (frames.length >= MIN_SPIN_FRAMES) {
    immersive.push({
      kind: "spin",
      id: "spin",
      frames: frames.map((frame) => frame.large_url || frame.url),
      thumbUrl: frames[0].thumb_url || frames[0].url,
      alt: `${product.name} — 360° view`,
    });
  }

  for (const panorama of media.panorama ?? []) {
    immersive.push({
      kind: "panorama",
      id: `panorama-${panorama.id}`,
      url: panorama.url,
      thumbUrl: panorama.thumb_url || panorama.url,
      alt: panorama.alt || `${product.name} — 360° room view`,
      caption: panorama.caption,
    });
  }

  return [...unique.slice(0, 1), ...immersive, ...unique.slice(1)];
}

/** The first photograph, for cart lines and share images. */
export function leadImage(items: GalleryItem[]): GalleryImageItem | undefined {
  return items.find((item): item is GalleryImageItem => item.kind === "image");
}

/** What a thumbnail or counter calls an item, for screen readers. */
export function describeItem(item: GalleryItem): string {
  switch (item.kind) {
    case "spin":
      return "360° spin";
    case "panorama":
      return "360° room panorama";
    default:
      return item.label ?? "Photo";
  }
}
