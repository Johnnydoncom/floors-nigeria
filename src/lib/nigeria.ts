/**
 * Nigerian address and customer vocabularies (§30). Values match what the API
 * validates and stores (`App\Support\NigerianStates`, `App\Enums\CustomerType`).
 */

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

export function stateLabel(state: string): string {
  return state === "FCT" ? "FCT (Abuja)" : state;
}

export const CUSTOMER_TYPES = [
  { value: "homeowner", label: "Homeowner / Renter" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "architect", label: "Architect" },
  { value: "contractor", label: "Contractor" },
  { value: "developer", label: "Developer" },
  { value: "commercial", label: "Commercial Buyer" },
] as const;

export const CONTACT_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;
