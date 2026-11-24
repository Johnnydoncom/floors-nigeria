import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/lib/api/catalog";
import { categoryHref } from "@/lib/floor-families";

/**
 * The material families as tiles — the first decision most shoppers make, so
 * it sits above the filters rather than inside them.
 */
export async function CategoryTiles() {
  const categories = (await getCategories()).filter((category) => !category.parent);

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Shop by material">
      <ul className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {categories.map((category) => (
          <li key={category.slug} className="w-36 shrink-0 snap-start sm:w-40">
            <Link href={categoryHref(category.slug)} className="group block">
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-muted">
                {category.image_url && (
                  <Image
                    src={category.image_url}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </span>
              <span className="mt-2 block truncate text-center font-display text-sm font-semibold transition group-hover:text-gold">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
