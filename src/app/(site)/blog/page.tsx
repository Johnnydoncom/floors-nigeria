import type { Metadata } from "next";
import { JournalIndex } from "@/components/content/JournalIndex";
import { JsonLd } from "@/components/site/JsonLd";
import { getPosts } from "@/lib/api/content";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Flooring Journal & Buying Guides",
  description:
    "Buying guides, care advice and design notes from Floor Nigeria — choosing, measuring, installing and looking after floors in Nigerian homes and buildings.",
  path: "/blog",
});

/** Enough for a year of publishing on one page; categories narrow it further. */
const POSTS_PER_PAGE = 48;

export default async function Journal() {
  const list = await getPosts({ per_page: POSTS_PER_PAGE });

  return (
    <>
      <JsonLd
        data={[
          itemListSchema(
            list.data.map((post) => ({ name: post.title, url: `/blog/${post.slug}` })),
          ),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Journal", url: "/blog" },
          ]),
        ]}
      />
      <JournalIndex
        list={list}
        title="Notes on choosing, fitting and caring for floors."
        intro="Practical buying guides, maintenance advice and design ideas from the team that supplies and installs floors across Nigeria."
      />
    </>
  );
}
