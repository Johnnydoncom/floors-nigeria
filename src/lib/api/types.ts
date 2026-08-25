/**
 * Types mirroring the Laravel v1 API resources.
 *
 * These are the contract between `app/Http/Resources/V1/*` and the storefront;
 * change them together.
 */

export type Paginated<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
};

export type Envelope<T> = { data: T };

export type Seo = {
  title: string;
  description: string | null;
  canonical: string | null;
  og_image: string | null;
  noindex: boolean;
};

export type Media = {
  id: number;
  collection: string;
  alt: string | null;
  caption: string | null;
  url: string;
  thumb_url: string;
  preview_url: string;
  large_url: string;
  sort_order: number;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  logo_url: string | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description?: string | null;
  default_waste_percentage: number;
  is_featured: boolean;
  image_url: string | null;
  parent?: Category | null;
  children?: Category[];
  products_count?: number;
  seo: Seo;
};

export type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_featured: boolean;
  image_url: string | null;
  brand?: Brand | null;
  products_count?: number;
  seo: Seo;
};

export type TaxonomyType = "room" | "style" | "look" | "use_case";

export type Taxonomy = {
  id: number;
  type: TaxonomyType;
  type_label: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  products_count?: number;
};

export type StockStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "made_to_order" | "discontinued";

export type Swatch = {
  id: number;
  label: string;
  color_hex: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Variant = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  color: { name: string | null; family: string | null; hex: string | null };
  finish: string | null;
  pattern: string | null;
  dimensions: {
    length_mm: number | null;
    width_mm: number | null;
    thickness_mm: number | null;
    wear_layer_mm: number | null;
    label: string | null;
  };
  packaging: { pieces_per_pack: number | null; coverage_per_pack_sqm: number | null };
  pricing: {
    currency: string;
    unit: string;
    unit_label: string;
    price: number | null;
    sale_price: number | null;
    effective_price: number | null;
    is_on_sale: boolean;
    minimum_order_quantity: number;
  };
  availability: {
    status: StockStatus;
    label: string;
    is_orderable: boolean;
    lead_time_days: number | null;
  };
  is_default: boolean;
  swatch_image_url: string | null;
  visualizer_texture_url: string | null;
  swatches?: Swatch[];
  media?: Media[];
};

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  sku_family: string | null;
  short_description: string | null;
  status: string;
  is_featured: boolean;
  image_url: string | null;
  thumb_url: string | null;
  price_from: number | null;
  currency: string;
  variant_count?: number;
  rating: { average: number; count: number };
  category?: Category;
  brand?: Brand;
  collection?: Collection;
  default_variant?: Variant;
  taxonomies?: Taxonomy[];
};

export type SpecificationGroup = {
  group: string;
  items: { label: string; value: string | null; unit: string | null }[];
};

export type ProductDocument = {
  id: number;
  type: string;
  type_label: string;
  title: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
};

export type Review = {
  id: number;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  published_at: string | null;
};

export type Product = ProductCard & {
  description: string | null;
  highlights: string[];
  installation_notes: string | null;
  care_notes: string | null;
  warranty: string | null;
  lead_time_days: number | null;
  waste_percentage: number;
  visualizer_texture_url: string | null;
  variants: Variant[];
  specifications: SpecificationGroup[];
  documents: ProductDocument[];
  media: Partial<Record<string, Media[]>>;
  related_products: ProductCard[];
  reviews: Review[];
  breadcrumbs: { name: string; slug: string }[];
  seo: Seo;
};

export type FilterOptions = {
  categories: { slug: string; name: string; children: { slug: string; name: string }[] }[];
  brands: { slug: string; name: string }[];
  taxonomies: Partial<Record<TaxonomyType, { slug: string; name: string }[]>>;
  attributes: {
    slug: string;
    name: string;
    unit: string | null;
    values: { slug: string; label: string; color_hex: string | null }[];
  }[];
  colors: string[];
  availability: { value: StockStatus; label: string }[];
  price: { min: number; max: number; currency: string };
  sorts: string[];
};

export type SearchResults = {
  data: {
    query: string;
    products: ProductCard[];
    categories: Category[];
    collections: Collection[];
  };
  meta: { total_products: number; zero_results: boolean };
};

export type CalculationResult = {
  id: number | null;
  rooms: { name: string; shape: string; area_sqm: number; deduction_sqm: number }[];
  total_area_sqm: number;
  deduction_area_sqm: number;
  net_area_sqm: number;
  waste_percentage: number;
  area_with_waste_sqm: number;
  packs_required: number | null;
  estimated_cost: number | null;
  accessories: { key: string; label: string; quantity: number; unit: string }[];
  currency: string;
  unit: string;
  disclaimer: string;
};

export type Quote = {
  id: number;
  reference: string;
  status: string;
  status_label: string;
  project: {
    type: string | null;
    city: string | null;
    state: string | null;
    preferred_installation_date: string | null;
    requires_site_survey: boolean;
    requires_delivery: boolean;
    requires_installation: boolean;
  };
  totals: {
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    total: number;
  };
  items?: {
    id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    line_total: number;
    product_slug: string | null;
    variant_sku: string | null;
  }[];
  notes: string | null;
  valid_until: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  is_staff: boolean;
  email_verified_at: string | null;
  customer_profile?: {
    id: number;
    full_name: string;
    customer_type: string;
    phone: string | null;
    whatsapp: string | null;
    city: string | null;
    state: string | null;
  } | null;
};
