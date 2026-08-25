/**
 * Legacy demo catalogue.
 *
 * The storefront reads live data from the Laravel API (`lib/api/catalog.ts`).
 * What remains here backs the navigation menu and the account/admin screens
 * that have not been migrated yet — delete it as those move over.
 */
// Image paths — served from public/images/
const oakImg = "/images/collection-oak.jpg";
const spcImg = "/images/collection-spc.jpg";
const stoneImg = "/images/collection-stone.jpg";
const hotelImg = "/images/project-hotel.jpg";
const officeImg = "/images/project-office.jpg";
const residenceImg = "/images/project-residence.jpg";
const heroFloor = "/images/hero-floor.jpg";
const materialsStrip = "/images/materials-strip.jpg";

export type Product = {
  slug: string;
  name: string;
  category: string;
  collection: string;
  price: number; // per m2, NGN
  img: string;
  gallery: string[];
  rating: number;
  reviews: number;
  tag?: string;
  origin: string;
  finishes: string[];
  blurb: string;
  specs: [string, string][];
};

export const CATEGORIES = [
  "Engineered Wood",
  "SPC & Vinyl",
  "Natural Stone",
  "Wall Panels",
  "Artificial Grass",
  "Outdoor Decking",
] as const;

const baseSpecs = (thickness: string, size: string, origin: string): [string, string][] => [
  ["Construction", `Multi-ply engineered · ${thickness}`],
  ["Plank size", size],
  ["Finish", "Brushed · UV-oil · Matte"],
  ["Installation", "Click-lock 5G · radiant-heat compatible"],
  ["Fire rating", "Cfl-s1 (EN 13501-1)"],
  ["Warranty", "25 years residential · 10 years commercial"],
  ["Origin", origin],
];

export const PRODUCTS: Product[] = [
  {
    slug: "engineered-oak-classic",
    name: "Engineered Oak Classic",
    category: "Engineered Wood",
    collection: "Heritage",
    price: 18500,
    img: oakImg,
    gallery: [oakImg, residenceImg, heroFloor, materialsStrip],
    rating: 4.9,
    reviews: 128,
    tag: "Bestseller",
    origin: "Italy",
    finishes: ["Natural", "Smoked", "Walnut", "Ebony"],
    blurb:
      "European white oak, brushed and UV-oiled. 220 × 2200 × 14 mm planks built for radiant heating and open-plan residential specification.",
    specs: baseSpecs("14 mm", "220 × 2200 mm", "Italy"),
  },
  {
    slug: "herringbone-noir",
    name: "Herringbone Noir",
    category: "Engineered Wood",
    collection: "Atelier",
    price: 24900,
    img: heroFloor,
    gallery: [heroFloor, oakImg, hotelImg, residenceImg],
    rating: 4.8,
    reviews: 74,
    tag: "New",
    origin: "Germany",
    finishes: ["Noir", "Espresso", "Cognac"],
    blurb:
      "Deep-fumed oak laid in classic French herringbone. A statement floor for galleries, boutiques and formal reception spaces.",
    specs: baseSpecs("15 mm", "120 × 600 mm", "Germany"),
  },
  {
    slug: "metropolis-spc",
    name: "Metropolis SPC",
    category: "SPC & Vinyl",
    collection: "Metropolis",
    price: 9800,
    img: spcImg,
    gallery: [spcImg, officeImg, materialsStrip, heroFloor],
    rating: 4.7,
    reviews: 213,
    tag: "Waterproof",
    origin: "Belgium",
    finishes: ["Ash", "Greige", "Sand", "Slate"],
    blurb:
      "Stone-polymer core with a 0.5 mm commercial wear layer. Fully waterproof, dimensionally stable and rated for heavy footfall.",
    specs: baseSpecs("5.5 mm + IXPE", "180 × 1220 mm", "Belgium"),
  },
  {
    slug: "urban-lvt",
    name: "Urban Luxury Vinyl",
    category: "SPC & Vinyl",
    collection: "Urban",
    price: 7600,
    img: officeImg,
    gallery: [officeImg, spcImg, materialsStrip, hotelImg],
    rating: 4.6,
    reviews: 96,
    origin: "Turkey",
    finishes: ["Concrete", "Oak", "Terrazzo"],
    blurb:
      "Glue-down luxury vinyl tile for offices, clinics and retail. Low-profile, acoustically quiet and endlessly repairable.",
    specs: baseSpecs("3 mm", "228 × 1219 mm", "Turkey"),
  },
  {
    slug: "savoy-marble",
    name: "Savoy Marble",
    category: "Natural Stone",
    collection: "Savoy",
    price: 34000,
    img: stoneImg,
    gallery: [stoneImg, hotelImg, materialsStrip, residenceImg],
    rating: 5.0,
    reviews: 41,
    tag: "Signature",
    origin: "Italy",
    finishes: ["Honed", "Polished", "Leathered"],
    blurb:
      "Book-matched Italian marble slabs, cut to your setting-out drawing. Supplied with sealing and lifetime restoration service.",
    specs: [
      ["Material", "Natural marble slab"],
      ["Thickness", "20 mm"],
      ["Slab size", "Up to 3200 × 1800 mm"],
      ["Finish", "Honed · Polished · Leathered"],
      ["Installation", "Wet-bed, specialist crew"],
      ["Warranty", "Lifetime restoration programme"],
      ["Origin", "Italy"],
    ],
  },
  {
    slug: "travertine-lux",
    name: "Travertine Lux",
    category: "Natural Stone",
    collection: "Savoy",
    price: 27500,
    img: hotelImg,
    gallery: [hotelImg, stoneImg, residenceImg, materialsStrip],
    rating: 4.8,
    reviews: 33,
    origin: "Turkey",
    finishes: ["Classic", "Silver", "Walnut"],
    blurb:
      "Vein-cut travertine with a soft matte surface. Ideal for spa, hospitality and indoor–outdoor thresholds.",
    specs: [
      ["Material", "Vein-cut travertine"],
      ["Thickness", "18 mm"],
      ["Tile size", "600 × 1200 mm"],
      ["Finish", "Honed & filled"],
      ["Installation", "Adhesive-set"],
      ["Warranty", "15 years"],
      ["Origin", "Turkey"],
    ],
  },
  {
    slug: "linea-wall-panel",
    name: "Linea Acoustic Wall Panel",
    category: "Wall Panels",
    collection: "Linea",
    price: 21000,
    img: residenceImg,
    gallery: [residenceImg, oakImg, officeImg, heroFloor],
    rating: 4.9,
    reviews: 58,
    tag: "Acoustic",
    origin: "Poland",
    finishes: ["Oak", "Walnut", "Black"],
    blurb:
      "Slatted timber acoustic panels on recycled PET felt. Reduces reverberation by up to 22% in open-plan rooms.",
    specs: [
      ["Construction", "Timber slats on PET felt"],
      ["Panel size", "600 × 2400 mm"],
      ["Acoustic", "NRC 0.55"],
      ["Fixing", "Concealed clip or adhesive"],
      ["Warranty", "10 years"],
      ["Origin", "Poland"],
    ],
  },
  {
    slug: "evergreen-turf",
    name: "Evergreen Landscape Turf",
    category: "Artificial Grass",
    collection: "Evergreen",
    price: 6400,
    img: materialsStrip,
    gallery: [materialsStrip, residenceImg, officeImg, heroFloor],
    rating: 4.5,
    reviews: 187,
    origin: "Netherlands",
    finishes: ["35 mm", "40 mm", "50 mm"],
    blurb:
      "UV-stable landscape turf with a soft hand and free-draining backing. Built for Nigerian sun and rainy-season downpours.",
    specs: [
      ["Pile height", "35 / 40 / 50 mm"],
      ["Backing", "Perforated latex, free-draining"],
      ["UV stability", "8 years guaranteed"],
      ["Roll width", "2 m / 4 m"],
      ["Warranty", "8 years"],
      ["Origin", "Netherlands"],
    ],
  },
  {
    slug: "teak-deck",
    name: "Composite Teak Decking",
    category: "Outdoor Decking",
    collection: "Marina",
    price: 15900,
    img: heroFloor,
    gallery: [heroFloor, residenceImg, hotelImg, stoneImg],
    rating: 4.7,
    reviews: 62,
    origin: "Malaysia",
    finishes: ["Teak", "Charcoal", "Driftwood"],
    blurb:
      "Co-extruded wood-plastic composite board. Splinter-free, slip-resistant and unaffected by termites or humidity.",
    specs: [
      ["Board size", "138 × 23 × 2900 mm"],
      ["Material", "Co-extruded WPC"],
      ["Slip rating", "R11"],
      ["Installation", "Hidden clip on joists"],
      ["Warranty", "15 years"],
      ["Origin", "Malaysia"],
    ],
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export const MEGA_MENU: {
  label: string;
  to: string;
  columns?: { title: string; links: { label: string; to: string }[] }[];
  feature?: { img: string; title: string; text: string; to: string };
}[] = [
  {
    label: "Products",
    to: "/products",
    columns: [
      {
        title: "By material",
        links: CATEGORIES.map((c) => ({ label: c, to: "/products" })),
      },
      {
        title: "By collection",
        links: [
          { label: "Heritage Oak", to: "/collections" },
          { label: "Atelier Herringbone", to: "/collections" },
          { label: "Metropolis SPC", to: "/collections" },
          { label: "Savoy Stone", to: "/collections" },
          { label: "Linea Wall", to: "/collections" },
        ],
      },
      {
        title: "Tools",
        links: [
          { label: "AI Room Visualizer", to: "/visualizer" },
          { label: "Floor Calculator", to: "/calculator" },
          { label: "Order samples", to: "/products" },
          { label: "Track an order", to: "/account" },
        ],
      },
    ],
    feature: {
      img: oakImg,
      title: "Heritage Oak",
      text: "European white oak, UV-oiled. From ₦18,500 /m².",
      to: "/products/engineered-oak-classic",
    },
  },
  {
    label: "Industries",
    to: "/industries",
    columns: [
      {
        title: "Sectors",
        links: [
          { label: "Residential", to: "/industries" },
          { label: "Commercial offices", to: "/industries" },
          { label: "Hospitality", to: "/industries" },
          { label: "Healthcare", to: "/industries" },
        ],
      },
      {
        title: "More sectors",
        links: [
          { label: "Education", to: "/industries" },
          { label: "Retail", to: "/industries" },
          { label: "Sports & fitness", to: "/industries" },
          { label: "Aviation & transport", to: "/industries" },
        ],
      },
      {
        title: "For professionals",
        links: [
          { label: "Trade accounts", to: "/contact" },
          { label: "Specifier resources", to: "/industries" },
          { label: "BIM & tech sheets", to: "/industries" },
          { label: "Project pricing", to: "/contact" },
        ],
      },
    ],
    feature: {
      img: officeImg,
      title: "Access Tower, Ikoyi",
      text: "12,800 m² of SPC delivered in 9 weeks.",
      to: "/projects",
    },
  },
  { label: "Projects", to: "/projects" },
  { label: "AI Studio", to: "/visualizer" },
  { label: "Journal", to: "/blog" },
  { label: "About", to: "/about" },
];
