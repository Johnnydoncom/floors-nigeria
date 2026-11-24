import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { JsonLd } from "@/components/site/JsonLd";
import { getPosts } from "@/lib/api/content";
import { faqSchema } from "@/lib/structured-data";

/**
 * The questions people ask before they buy. Every answer states only what the
 * rest of the site already commits to, so it never promises more than we do.
 */
export const HOME_FAQS = [
  {
    question: "Which floor is best for a Nigerian home?",
    answer:
      "For most rooms, SPC: it is fully waterproof, stays stable through humid seasons and is easy to mop. Laminate feels warmer and quieter underfoot in bedrooms and living rooms, and engineered wood suits rooms where you want real timber. Find My Floor narrows the choice to three in five questions.",
  },
  {
    question: "Do you install the floor, or only supply it?",
    answer:
      "Both. Our own crews install everything we sell, and their work carries a 5-year workmanship cover. We can also supply only, if you have your own installer.",
  },
  {
    question: "Do you deliver outside Lagos?",
    answer:
      "Yes. We deliver and install nationwide from our Lagos warehouses, and have branches in Abuja, Ibadan, Enugu, Owerri, Aba, Port Harcourt, Warri and Uyo. The delivery cost is shown at checkout or included in your quotation.",
  },
  {
    question: "Can I see a floor before I buy it?",
    answer:
      "Yes: visit any of our showrooms, order up to five samples to your door, or lay the floor in a photo of your room with the room visualizer.",
  },
  {
    question: "How much flooring do I need?",
    answer:
      "Measure each room's length and width, multiply, and add a cutting allowance, usually 5 to 10%, and more for herringbone. The floor calculator does the sums and adds the installation cost, and our site survey confirms the final figure.",
  },
  {
    question: "Is there a warranty?",
    answer:
      "Each floor carries its manufacturer's warranty, up to 25 years depending on the product, and our installation carries a 5-year workmanship cover.",
  },
];

/** Buying guides from the journal, and the questions people ask most. */
export async function AdviceSection() {
  const { data: posts } = await getPosts({ per_page: 3 });

  return (
    <section aria-labelledby="home-advice" className="container-fluid py-12 md:py-24">
      <JsonLd data={faqSchema(HOME_FAQS)} />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeader
            id="home-advice"
            title="Questions, answered"
            lead="What people ask us most before they choose a floor."
          />
          {posts.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-sm font-semibold text-muted-foreground">
                Buying guides
              </h3>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-center gap-4 py-4"
                    >
                      {post.image_url && (
                        <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={post.image_url}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-display font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
                          {post.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {post.reading_minutes} min read
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/blog"
                className="mt-4 inline-block font-display text-sm font-semibold underline-offset-4 hover:underline"
              >
                All guides and articles
              </Link>
            </div>
          )}
        </div>

        <div className="divide-y divide-border border-y border-border lg:col-span-7">
          {HOME_FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="-mt-1 max-w-2xl pb-6 leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
