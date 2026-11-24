import { ProductCard } from "@/components/catalog/ProductCard";
import { getProducts } from "@/lib/api/catalog";
import { ScrollRail } from "./ScrollRail";
import { SectionHeader } from "./SectionHeader";

const ITEM = "w-[78vw] max-w-[19rem] shrink-0 snap-start sm:w-[45vw] lg:w-[23%]";

/** The floors people look at most, in a row that scrolls. */
export async function Bestsellers() {
  const { data } = await getProducts({ sort: "popular", per_page: 10 });
  if (data.length === 0) return null;

  return (
    <section
      aria-labelledby="home-bestsellers"
      className="border-y border-border bg-surface py-16 md:py-24"
    >
      <div className="container-fluid">
        <ScrollRail
          label="Popular floors"
          header={
            <SectionHeader
              id="home-bestsellers"
              title="Our most popular floors"
              lead="See any of them in a room, order a sample, or ask for a quote on WhatsApp."
              action={{ label: "Shop all products", href: "/products" }}
            />
          }
        >
          {data.map((product) => (
            <li key={product.id} className={ITEM}>
              <ProductCard product={product} />
            </li>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}

export function BestsellersSkeleton() {
  return (
    <div className="border-y border-border bg-surface py-16 md:py-24">
      <div className="container-fluid">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-10 flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={`${ITEM} aspect-[3/4] animate-pulse rounded-lg bg-muted`} />
          ))}
        </div>
      </div>
    </div>
  );
}
