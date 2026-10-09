import type { Metadata } from "next";
import { CheckoutView } from "@/components/commerce/CheckoutView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Secure checkout",
  description: "Confirm delivery, installation and payment for your Floor Nigeria order.",
  path: "/checkout",
  noindex: true,
  follow: false,
});

export default function CheckoutPage() {
  return (
    <div className="pt-header pb-24">
      <div className="container-fluid">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">Secure checkout</h1>
        <CheckoutView />
      </div>
    </div>
  );
}
