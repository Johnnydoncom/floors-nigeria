import type { Metadata } from "next";
import { CartView } from "@/components/commerce/CartView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Your cart",
  description: "Review your flooring selection, quantities and delivery before checkout.",
  path: "/cart",
  // A cart is personal and changes per visitor; it has nothing to rank for.
  noindex: true,
});

export default function CartPage() {
  return (
    <div className="pt-header pb-24">
      <div className="container-fluid">
        <p className="eyebrow">Checkout step 1 of 2</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">Your cart</h1>

        <CartView />
      </div>
    </div>
  );
}
