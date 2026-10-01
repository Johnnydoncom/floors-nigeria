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
  return <CheckoutView />;
}
