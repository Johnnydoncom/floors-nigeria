/**
 * Floor Nigeria's branch network — head office, showrooms and warehouses.
 *
 * One list drives the /branches locator, each branch's own page, the contact
 * page, the footer and the LocalBusiness structured data, so an address or a
 * phone number is corrected in exactly one place.
 *
 * Phone numbers are stored in E.164 and formatted for display by
 * {@link formatPhone}. `geo` is approximate (city or district level) and only
 * places the branch on the network map — directions always search the street
 * address itself.
 */

export type BranchKind = "head-office" | "showroom" | "warehouse";

export type RegionId =
  "lagos" | "abuja" | "south-west" | "south-east" | "south-south" | "west-africa";

export type CountryCode = "NG" | "GH" | "TG" | "BJ";

/** A city on the network map. Several branches can share one (Lagos has eight). */
export type HubId =
  | "lagos"
  | "ibadan"
  | "abuja"
  | "enugu"
  | "owerri"
  | "aba"
  | "port-harcourt"
  | "warri"
  | "uyo"
  | "accra"
  | "lome"
  | "cotonou";

export type Branch = {
  slug: string;
  /** Short name used on cards, e.g. "Oregun" or "Port Harcourt". */
  name: string;
  kind: BranchKind;
  region: RegionId;
  hub: HubId;
  /** District or neighbourhood shown above the address. */
  area: string;
  city: string;
  state: string;
  country: CountryCode;
  /** Street address, one line per entry. */
  address: string[];
  /** How to find it: bus stops, plazas, landmarks across the road. */
  landmark?: string;
  phones: string[];
  emails: string[];
  /** Approximate [lat, lng] for the network map. */
  geo: [number, number];
};

export const COUNTRIES: Record<CountryCode, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  TG: "Togo",
  BJ: "Benin Republic",
};

export const BRANCHES: Branch[] = [
  {
    slug: "head-office-ikeja",
    name: "Head Office",
    kind: "head-office",
    region: "lagos",
    hub: "lagos",
    area: "Ikeja",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["3rd Floor, 42 Olowu Street", "Ikeja, Lagos"],
    phones: ["+2349060008792", "+2348138352355"],
    emails: ["info@floornigeria.com", "floornigeria@gmail.com"],
    geo: [6.6, 3.35],
  },
  {
    slug: "oregun",
    name: "Oregun",
    kind: "showroom",
    region: "lagos",
    hub: "lagos",
    area: "Oregun, Ikeja",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Irorun Plaza, 65 Kudirat Abiola Way", "Oregun, Ikeja, Lagos"],
    phones: ["+2348140000552"],
    emails: ["chuviedecororegun@gmail.com", "medicalfloorsng@gmail.com"],
    geo: [6.61, 3.37],
  },
  {
    slug: "mushin",
    name: "Mushin",
    kind: "showroom",
    region: "lagos",
    hub: "lagos",
    area: "Olorunsogo, Mushin",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Oduntan Plaza, 294 Agege Motor Road", "Mushin, Lagos"],
    landmark: "Opposite GTBank, Olorunsogo Bus Stop",
    phones: ["+2349060002990"],
    emails: ["chuviedecorpalmavenue@gmail.com"],
    geo: [6.53, 3.35],
  },
  {
    slug: "orile",
    name: "Orile",
    kind: "showroom",
    region: "lagos",
    hub: "lagos",
    area: "Coker, Orile",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Odunade Market, Coker Market Road", "Coker, Lagos"],
    landmark: "Along the Lagos–Badagry Expressway",
    phones: ["+2349065201220"],
    emails: ["floordecororile@gmail.com"],
    geo: [6.48, 3.33],
  },
  {
    slug: "lawanson",
    name: "Lawanson",
    kind: "showroom",
    region: "lagos",
    hub: "lagos",
    area: "Lawanson",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["117 Lawanson Road", "Lawanson, Lagos"],
    landmark: "Pako Bus Stop",
    phones: ["+2347047041858"],
    emails: [],
    geo: [6.52, 3.35],
  },
  {
    slug: "lekki",
    name: "Lekki",
    kind: "showroom",
    region: "lagos",
    hub: "lagos",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Banex Mall, Plot 1–10 Akiogun Road", "Lekki Phase 1, Lagos"],
    phones: ["+2347066843352", "+2349063232113"],
    emails: ["floorsngisland@gmail.com", "chuviefloorngltd@gmail.com"],
    geo: [6.45, 3.47],
  },
  {
    slug: "isolo-warehouse",
    name: "Isolo Warehouse",
    kind: "warehouse",
    region: "lagos",
    hub: "lagos",
    area: "Isolo",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Banex Industries, 15–17 Abimbola Street", "Isolo, Lagos"],
    phones: ["+2348138352355"],
    emails: ["info@floornigeria.com"],
    geo: [6.53, 3.32],
  },
  {
    slug: "lakowe-warehouse",
    name: "Lakowe Warehouse",
    kind: "warehouse",
    region: "lagos",
    hub: "lagos",
    area: "Lakowe",
    city: "Lagos",
    state: "Lagos",
    country: "NG",
    address: ["Onishon, Lakowe", "Lagos"],
    phones: ["+2348138352355"],
    emails: [],
    geo: [6.47, 3.69],
  },
  {
    slug: "abuja-utako",
    name: "Utako",
    kind: "showroom",
    region: "abuja",
    hub: "abuja",
    area: "Utako",
    city: "Abuja",
    state: "FCT",
    country: "NG",
    address: ["Suite 34, Tian Plaza", "Utako, Abuja"],
    landmark: "Beside Eterna Filling Station",
    phones: ["+2348140000624", "+2347036871992"],
    emails: ["floorsngdecor@gmail.com", "chuvieabj@gmail.com"],
    geo: [9.07, 7.44],
  },
  {
    slug: "abuja-gudu",
    name: "Gudu",
    kind: "showroom",
    region: "abuja",
    hub: "abuja",
    area: "Gudu",
    city: "Abuja",
    state: "FCT",
    country: "NG",
    address: ["Shops RF 50 & 51, Kaura Market", "Gudu, Abuja"],
    landmark: "Opposite Prince & Princess Estate",
    phones: ["+2347036871992", "+2348140000624"],
    emails: [],
    geo: [9.01, 7.47],
  },
  {
    slug: "ibadan",
    name: "Ibadan",
    kind: "showroom",
    region: "south-west",
    hub: "ibadan",
    area: "Apata",
    city: "Ibadan",
    state: "Oyo",
    country: "NG",
    address: ["Opposite Bitemore, Apata", "Ibadan, Oyo State"],
    phones: ["+2347045173425", "+2348138352355"],
    emails: ["floornigeriaibadan@gmail.com"],
    geo: [7.38, 3.84],
  },
  {
    slug: "enugu",
    name: "Enugu",
    kind: "showroom",
    region: "south-east",
    hub: "enugu",
    area: "Trans-Ekulu",
    city: "Enugu",
    state: "Enugu",
    country: "NG",
    address: ["Ekulu Plaza, Trans-Ekulu", "Enugu, Enugu State"],
    landmark: "Opposite Bes Stop Filling Station, by Penoks Junction",
    phones: ["+2348161560052", "+2349067506020"],
    emails: ["floorsdecorenugu@gmail.com"],
    geo: [6.47, 7.53],
  },
  {
    slug: "owerri",
    name: "Owerri",
    kind: "showroom",
    region: "south-east",
    hub: "owerri",
    area: "Owerri",
    city: "Owerri",
    state: "Imo",
    country: "NG",
    address: ["7 Musa Yar’Adua Drive", "Owerri, Imo State"],
    phones: ["+2347063953837"],
    emails: ["floorsnigeriaowerri@gmail.com"],
    geo: [5.48, 7.03],
  },
  {
    slug: "aba",
    name: "Aba",
    kind: "showroom",
    region: "south-east",
    hub: "aba",
    area: "Aba",
    city: "Aba",
    state: "Abia",
    country: "NG",
    address: ["35 Nwachukwu, by Faulks Road", "Aba, Abia State"],
    phones: ["+2347063953837"],
    emails: [],
    geo: [5.11, 7.37],
  },
  {
    slug: "port-harcourt",
    name: "Port Harcourt",
    kind: "showroom",
    region: "south-south",
    hub: "port-harcourt",
    area: "Ada George",
    city: "Port Harcourt",
    state: "Rivers",
    country: "NG",
    address: ["No. 3, Shops 83 & 84, Glass House Plaza", "Ada George Road, Port Harcourt"],
    landmark: "By Mechanic Junction · Mile 3 shop, Ikwerre Road",
    phones: ["+2347013785077", "+2349073512001"],
    emails: ["floornigeriaph@gmail.com"],
    geo: [4.84, 6.98],
  },
  {
    slug: "warri",
    name: "Warri",
    kind: "showroom",
    region: "south-south",
    hub: "warri",
    area: "Effurun",
    city: "Warri",
    state: "Delta",
    country: "NG",
    address: [
      "First Floor, Berger Paints Building",
      "111 Effurun–Sapele Road, Effurun, Delta State",
    ],
    landmark: "Opposite Ecobank, after Airport Junction",
    phones: ["+2349163990000"],
    emails: [],
    geo: [5.56, 5.79],
  },
  {
    slug: "uyo",
    name: "Uyo",
    kind: "showroom",
    region: "south-south",
    hub: "uyo",
    area: "Ikpa Road",
    city: "Uyo",
    state: "Akwa Ibom",
    country: "NG",
    address: ["107 Ikpa Road", "Uyo, Akwa Ibom State"],
    landmark: "Before Qua Iboe Church",
    phones: ["+2347077680425", "+2347072958707"],
    emails: [],
    geo: [5.04, 7.91],
  },
  {
    slug: "accra-ghana",
    name: "Accra",
    kind: "showroom",
    region: "west-africa",
    hub: "accra",
    area: "Dansoman",
    city: "Accra",
    state: "Greater Accra",
    country: "GH",
    address: ["1 Justice Apalo (GA-538-0531), 9th Avenue", "Dansoman, Accra"],
    landmark: "Opposite Mama’s Inn Junction",
    phones: ["+233205291127"],
    emails: ["flooringghana@gmail.com"],
    geo: [5.55, -0.26],
  },
  {
    slug: "lome-togo",
    name: "Lomé",
    kind: "showroom",
    region: "west-africa",
    hub: "lome",
    area: "FOPADESC",
    city: "Lomé",
    state: "Maritime",
    country: "TG",
    address: ["FOPADESC, derrière le terrain de golf", "Lomé"],
    landmark: "Behind the golf course",
    phones: ["+22898130799"],
    emails: ["floorsdecortogo@gmail.com"],
    geo: [6.15, 1.22],
  },
  {
    slug: "cotonou-benin",
    name: "Cotonou",
    kind: "showroom",
    region: "west-africa",
    hub: "cotonou",
    area: "Dedokpo",
    city: "Cotonou",
    state: "Littoral",
    country: "BJ",
    address: ["Next to St. Raphael Pharmacy, on the paved road", "Dedokpo, Cotonou"],
    landmark: "By the Dedokpo traffic lights",
    phones: ["+22996038441", "+22996043915"],
    emails: ["floorsbenin@gmail.com"],
    geo: [6.37, 2.39],
  },
];

export type Region = {
  id: RegionId;
  name: string;
  /** One line under the region heading. */
  summary: string;
};

/** Display order runs from the head office outwards. */
export const REGIONS: Region[] = [
  {
    id: "lagos",
    name: "Lagos",
    summary: "Head office, mainland and Island showrooms, two warehouses",
  },
  { id: "abuja", name: "Abuja", summary: "Federal Capital Territory" },
  { id: "south-west", name: "South West", summary: "Oyo State" },
  { id: "south-east", name: "South East", summary: "Enugu, Imo and Abia" },
  { id: "south-south", name: "South South", summary: "Rivers, Delta and Akwa Ibom" },
  { id: "west-africa", name: "West Africa", summary: "Ghana, Togo and Benin Republic" },
];

export type Hub = {
  id: HubId;
  label: string;
  region: RegionId;
  geo: [number, number];
  /** Which side of the marker the label sits, so dense clusters stay legible. */
  labelSide: "left" | "right" | "above" | "below";
  /** Phones use larger labels; cities near the east edge flip inwards there. */
  mobileLabelSide?: "left" | "right" | "above" | "below";
  /** Hidden on narrow screens unless highlighted — the South East is crowded. */
  minor?: boolean;
};

export const HUBS: Hub[] = [
  { id: "lagos", label: "Lagos", region: "lagos", geo: [6.55, 3.4], labelSide: "above" },
  { id: "ibadan", label: "Ibadan", region: "south-west", geo: [7.38, 3.84], labelSide: "above" },
  {
    id: "abuja",
    label: "Abuja",
    region: "abuja",
    geo: [9.05, 7.46],
    labelSide: "right",
    mobileLabelSide: "left",
  },
  {
    id: "enugu",
    label: "Enugu",
    region: "south-east",
    geo: [6.46, 7.53],
    labelSide: "right",
    mobileLabelSide: "left",
  },
  {
    id: "owerri",
    label: "Owerri",
    region: "south-east",
    geo: [5.48, 7.03],
    labelSide: "left",
    minor: true,
  },
  {
    id: "aba",
    label: "Aba",
    region: "south-east",
    geo: [5.11, 7.37],
    labelSide: "below",
    minor: true,
  },
  {
    id: "port-harcourt",
    label: "Port Harcourt",
    region: "south-south",
    geo: [4.82, 7.03],
    labelSide: "below",
  },
  { id: "warri", label: "Warri", region: "south-south", geo: [5.55, 5.79], labelSide: "left" },
  {
    id: "uyo",
    label: "Uyo",
    region: "south-south",
    geo: [5.04, 7.91],
    labelSide: "right",
    minor: true,
  },
  { id: "accra", label: "Accra", region: "west-africa", geo: [5.55, -0.26], labelSide: "below" },
  { id: "lome", label: "Lomé", region: "west-africa", geo: [6.13, 1.22], labelSide: "below" },
  { id: "cotonou", label: "Cotonou", region: "west-africa", geo: [6.37, 2.39], labelSide: "below" },
];

export const HEAD_OFFICE = BRANCHES.find((branch) => branch.kind === "head-office")!;

export function getBranch(slug: string): Branch | undefined {
  return BRANCHES.find((branch) => branch.slug === slug);
}

export const NETWORK_STATS = (() => {
  const nigerian = BRANCHES.filter((branch) => branch.country === "NG");
  const states = new Set(nigerian.map((branch) => branch.state));

  return {
    locations: BRANCHES.length,
    /** Head office plus showrooms — the places a customer can walk into. */
    branches: BRANCHES.filter((branch) => branch.kind !== "warehouse").length,
    warehouses: BRANCHES.filter((branch) => branch.kind === "warehouse").length,
    cities: HUBS.length,
    /** Nigerian states, excluding the FCT. */
    states: [...states].filter((state) => state !== "FCT").length,
    countries: new Set(BRANCHES.map((branch) => branch.country)).size,
  };
})();

export const KIND_LABELS: Record<BranchKind, string> = {
  "head-office": "Head office",
  showroom: "Showroom",
  warehouse: "Warehouse",
};

/**
 * Local format for Nigerian lines ("0906 000 8792"), which is how customers
 * write them; international format, grouped in pairs, elsewhere.
 */
export function formatPhone(e164: string): string {
  if (e164.startsWith("+234")) {
    const local = `0${e164.slice(4)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (e164.startsWith("+233")) {
    const rest = e164.slice(4);
    return `+233 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  }

  const code = e164.slice(0, 4);
  const pairs = e164.slice(4).match(/.{1,2}/g) ?? [];
  return [code, ...pairs].join(" ");
}

/** The full postal line, for structured data and map searches. */
export function fullAddress(branch: Branch): string {
  return [...branch.address, COUNTRIES[branch.country]].join(", ");
}

/** Opens turn-by-turn directions in Google Maps (or the native app on phones). */
export function directionsUrl(branch: Branch): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(branch))}`;
}

/** Keyless Google Maps embed for a branch's address. */
export function mapEmbedUrl(branch: Branch): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress(branch))}&z=15&output=embed`;
}

export function branchTitle(branch: Branch): string {
  return `Floor Nigeria ${branch.name}`;
}
