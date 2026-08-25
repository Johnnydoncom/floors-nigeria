/**
 * Nigerian localisation helpers (§30). Shared by server and client components.
 */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const nairaWithKoboFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

export function naira(amount: number | null | undefined, { kobo = false } = {}): string {
  if (amount === null || amount === undefined) return "Price on request";
  return kobo ? nairaWithKoboFormatter.format(amount) : nairaFormatter.format(amount);
}

const areaFormatter = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 });

export function area(value: number, unit: "sqm" | "sqft" = "sqm"): string {
  return `${areaFormatter.format(value)} ${unit === "sqm" ? "m²" : "ft²"}`;
}

export function number(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits }).format(value);
}

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/**
 * Nigerian mobile numbers, normalised to E.164 for `tel:` and WhatsApp links.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+${digits}`;
}

export function whatsAppLink(phone: string, message?: string): string {
  const number = toE164(phone).replace("+", "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${query}`;
}
