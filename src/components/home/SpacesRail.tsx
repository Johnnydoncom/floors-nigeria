import Image from "next/image";
import Link from "next/link";
import { ScrollRail } from "./ScrollRail";
import { SectionHeader } from "./SectionHeader";
import { getCategories } from "@/lib/api/catalog";

type Space = {
  name: string;
  note: string;
  href: string;
  image: string;
  /** A category whose own photograph, when it has one, shows this space better. */
  categoryImage?: string;
};

const SPACES: Space[] = [
  {
    name: "Living rooms",
    note: "SPC, laminate and real wood",
    href: "/rooms/living-room",
    image: "/images/home/space-living-720.webp",
  },
  {
    name: "Kitchens & bathrooms",
    note: "Waterproof SPC and vinyl",
    href: "/rooms/kitchen",
    image: "/images/home/space-kitchen-720.webp",
  },
  {
    name: "Offices",
    note: "Carpet tiles, SPC and vinyl",
    href: "/rooms/office",
    image: "/images/home/space-office-720.webp",
  },
  {
    name: "Hotels & lobbies",
    note: "Hard-wearing floors for heavy footfall",
    href: "/rooms/hotel",
    image: "/images/home/space-hotel-720.webp",
  },
  {
    name: "Gyms & sports",
    note: "Rubber tiles that absorb impact",
    href: "/products/rubber-gym-flooring",
    image: "/images/home/space-office-720.webp",
    categoryImage: "rubber-gym-flooring",
  },
  {
    name: "Gardens & play areas",
    note: "Artificial grass for lawns and terraces",
    href: "/products/artificial-grass",
    image: "/images/home/space-materials-720.webp",
    categoryImage: "artificial-grass",
  },
];

/** Shop by the space being floored, for visitors who know the room, not the material. */
export async function SpacesRail() {
  const categories = await getCategories();
  const photo = (slug?: string) =>
    slug ? (categories.find((category) => category.slug === slug)?.image_url ?? null) : null;

  return (
    <section aria-labelledby="home-spaces" className="container-fluid py-12 md:py-24">
      <ScrollRail
        label="Spaces"
        header={
          <SectionHeader
            id="home-spaces"
            title="Shop by space"
            lead="Start from the room. We'll show the floors that cope with how it's used."
          />
        }
      >
        {SPACES.map((space) => (
          <li
            key={space.name}
            className="w-[70vw] max-w-[18rem] shrink-0 snap-start sm:w-[40vw] lg:w-[calc((100%-5rem)/6)] lg:max-w-none"
          >
            <Link
              href={space.href}
              className="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-lg bg-muted p-5 text-primary-foreground"
            >
              <Image
                src={photo(space.categoryImage) ?? space.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 40vw, 70vw"
                className="-z-10 object-cover transition duration-700 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal-dark/85 via-charcoal-dark/20 to-transparent"
              />
              <span className="font-display text-lg font-semibold leading-tight">{space.name}</span>
              <span className="mt-1 text-sm text-primary-foreground/75">{space.note}</span>
            </Link>
          </li>
        ))}
      </ScrollRail>
    </section>
  );
}
