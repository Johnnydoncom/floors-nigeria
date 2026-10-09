import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalIndex } from "@/components/content/JournalIndex";
import { JsonLd } from "@/components/site/JsonLd";
import { getPosts } from "@/lib/api/content";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";

type PageProps = { params: Promise<{ category: string }> };

async function load(slug: string) {
  const list = await getPosts({ category: slug, per_page: 48 });
  const category = list.categories.find((entry) => entry.slug === slug);

  return { list, category };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const { category } = await load(slug);

  if (!category) return { title: "Category not found", robots: { index: false } };

  return pageMetadata({
    title: `${category.name} — Flooring Journal`,
    description: `${category.name} from the Floor Nigeria journal: ${category.count} article${category.count === 1 ? "" : "s"} on choosing, fitting and caring for floors.`,
    path: `/blog/category/${category.slug}`,
  });
}

export default async function JournalCategory({ params }: PageProps) {
  const { category: slug } = await params;
  const { list, category } = await load(slug);

  if (!category) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Journal", url: "/blog" },
          { name: category.name, url: `/blog/category/${category.slug}` },
        ])}
      />
      <JournalIndex
        list={list}
        activeCategory={category.slug}
        title={category.name}
        intro={`Every ${category.name.toLowerCase()} article from the team that supplies and installs floors across Nigeria.`}
      />
    </>
  );
}
