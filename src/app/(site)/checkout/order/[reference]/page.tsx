import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { OrderStatusView } from "@/components/commerce/OrderStatusView";
import { pageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ reference: string }> };

export const metadata: Metadata = pageMetadata({
  title: "Your order",
  description: "Payment and delivery status for your Floor Nigeria order.",
  path: "/checkout",
  noindex: true,
  follow: false,
});

/**
 * The order page. Everything about the order is personal and read in the
 * browser (it needs the access token from the URL), so the page itself is a
 * shell around a client island.
 */
export default function OrderPage({ params }: PageProps) {
  return (
    <div className="container-fluid pb-24 pt-header md:pt-[calc(var(--header-height)+2rem)]">
      <Suspense fallback={<OrderLoading />}>
        <OrderReference params={params} />
      </Suspense>
    </div>
  );
}

async function OrderReference({ params }: PageProps) {
  const { reference } = await params;

  return <OrderStatusView reference={decodeURIComponent(reference)} />;
}

function OrderLoading() {
  return (
    <div className="flex justify-center py-24" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-gold" aria-label="Loading your order" />
    </div>
  );
}
