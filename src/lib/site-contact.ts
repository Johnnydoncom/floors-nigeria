/**
 * Where enquiries go.
 *
 * WhatsApp is the default sales channel for Nigerian flooring buyers (§30), so
 * the number is configured once here rather than repeated across the header,
 * the drawer and every product card.
 */

import { HEAD_OFFICE } from "@/lib/branches";

/** The head office line unless an environment overrides it. */
export const SHOWROOM_PHONE = process.env.NEXT_PUBLIC_SHOWROOM_PHONE ?? HEAD_OFFICE.phones[0];

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? SHOWROOM_PHONE;

export const SHOWROOM_EMAIL = process.env.NEXT_PUBLIC_SHOWROOM_EMAIL ?? HEAD_OFFICE.emails[0];

/**
 * Prefill a WhatsApp order enquiry with everything a consultant needs to reply
 * with a price: the product, the chosen finish, and a link back to the page.
 */
export function orderEnquiry({
  productName,
  variantName,
  url,
}: {
  productName: string;
  variantName?: string | null;
  url?: string;
}): string {
  const finish = variantName ? ` in ${variantName}` : "";
  const link = url ? `\n${url}` : "";

  return `Hello Floor Nigeria, I would like to order ${productName}${finish}. Please send me a price and delivery details.${link}`;
}
