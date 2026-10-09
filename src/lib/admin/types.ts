/**
 * Types mirroring the Laravel admin API (`app/Http/Resources/V1/Admin/*`).
 * Change them together.
 */

export type { Paginated } from "@/lib/api/types";

export type Option = { value: string; label: string };
export type Person = { id: number; name: string } | null;

export type CountMap = Record<string, number>;

/** Paginated list with the per-status counts some admin lists add. */
export type AdminList<T> = {
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
  counts?: CountMap;
};

export type Detail<T, R = Record<string, never>> = { data: T; related: R };

// --- Session & lookups ---------------------------------------------------------

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  is_staff: boolean;
  roles: { name: string; label: string }[];
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string | null;
};

export type AdminSession = {
  user: StaffMember;
  permissions: string[];
  scopes: { own_records_only: boolean; assigned_jobs_only: boolean };
  unread_notifications: number;
};

export type StageOption = Option & { probability: number; is_closed: boolean };

export type Lookups = {
  enums: {
    product_status: Option[];
    product_type: Option[];
    stock_status: Option[];
    selling_unit: Option[];
    swatch_type: Option[];
    attribute_type: Option[];
    taxonomy_type: Option[];
    document_type: Option[];
    review_status: Option[];
    customer_type: Option[];
    contact_channel: Option[];
    lead_status: Option[];
    lead_source: Option[];
    opportunity_stage: StageOption[];
    quote_status: Option[];
    order_status: Option[];
    payment_status: Option[];
    payment_gateway: Option[];
    content_status: Option[];
    appointment_type: Option[];
    appointment_status: Option[];
    survey_status: Option[];
    project_status: Option[];
    installation_status: Option[];
    task_status: Option[];
    task_priority: Option[];
    activity_type: Option[];
    role: Option[];
  };
  staff: { id: number; name: string; job_title: string | null; roles: string[] }[];
  states: string[];
};

export type CatalogLookups = {
  categories: { id: number; parent_id: number | null; name: string; depth: number }[];
  brands: { id: number; name: string }[];
  collections: { id: number; name: string; brand_id: number | null }[];
  taxonomies: { id: number; type: string; type_label: string; name: string }[];
  attributes: {
    id: number;
    name: string;
    swatch_type: string;
    is_variation: boolean;
    terms: { id: number; label: string; color_hex: string | null; swatch_url: string | null }[];
  }[];
};

export type SearchResult = {
  id: number;
  label: string;
  detail: string | null;
  price?: number | null;
  unit?: string;
  coverage_per_pack_sqm?: number | null;
  customer_profile_id?: number;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string | null;
  path: string;
  read_at: string | null;
  created_at: string | null;
};

// --- Catalogue -------------------------------------------------------------------

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku_family: string | null;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  is_featured: boolean;
  category: { id: number; name: string } | null;
  brand: string | null;
  thumb_url: string | null;
  price_from: number | null;
  price_to: number | null;
  variant_count: number;
  active_variant_count: number;
  stock: { low: number; out: number };
  published_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type Variant = {
  id: number;
  sku: string;
  name: string;
  slug: string;
  length_mm: number | null;
  width_mm: number | null;
  thickness_mm: number | null;
  wear_layer_mm: number | null;
  pieces_per_pack: number | null;
  coverage_per_pack_sqm: number | null;
  selling_unit: string;
  selling_unit_label: string;
  price: number | null;
  sale_price: number | null;
  effective_price: number | null;
  minimum_order_quantity: number | null;
  stock_status: string;
  stock_status_label: string;
  stock_quantity: number | null;
  lead_time_days: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  term_ids: number[];
  terms: { id: number; attribute_id: number; label: string }[];
  image_url: string | null;
};

export type MediaItem = {
  id: number;
  collection: string;
  variant_id: number | null;
  name: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  alt: string | null;
  caption: string | null;
  url: string;
  thumb_url: string;
  sort_order: number | null;
  created_at: string | null;
};

export type ProductDocument = {
  id: number;
  type: string;
  type_label: string;
  title: string;
  url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  is_public: boolean;
};

export type ProductAttributeConfig = {
  attribute_id: number;
  name: string | null;
  swatch_type: string | null;
  is_visible: boolean;
  is_variation: boolean;
  term_ids: number[];
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  type: "simple" | "variable";
  status: string;
  status_label: string;
  is_featured: boolean;
  sku_family: string | null;
  short_description: string | null;
  description: string | null;
  highlights: string[];
  installation_notes: string | null;
  care_notes: string | null;
  warranty: string | null;
  waste_percentage: number | null;
  lead_time_days: number | null;
  published_at: string | null;
  seo: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    noindex: boolean;
  };
  brand_id: number | null;
  collection_id: number | null;
  primary_category_id: number | null;
  category_ids: number[];
  taxonomy_ids: number[];
  attributes: ProductAttributeConfig[];
  variants: Variant[];
  media: MediaItem[];
  documents: ProductDocument[];
  thumb_url: string | null;
  rating_average: number | null;
  rating_count: number;
  view_count: number;
  public_url: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type Category = {
  id: number;
  parent_id: number | null;
  depth: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  default_waste_percentage: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  seo: { title: string | null; description: string | null };
  image_url: string | null;
  product_count: number;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  country: string | null;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  product_count: number;
};

export type CollectionRow = {
  id: number;
  brand_id: number | null;
  brand: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  image_url: string | null;
  product_count: number;
};

export type TaxonomyRow = {
  id: number;
  type: string;
  type_label: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  product_count: number;
};

export type Term = {
  id: number;
  attribute_id: number;
  value: string;
  slug: string;
  label: string | null;
  display_label: string;
  description: string | null;
  color_hex: string | null;
  swatch_url: string | null;
  sort_order: number;
};

export type AttributeRow = {
  id: number;
  name: string;
  slug: string;
  type: string;
  type_label: string;
  swatch_type: string;
  swatch_type_label: string;
  unit: string | null;
  group: string | null;
  is_filterable: boolean;
  is_visible: boolean;
  is_comparable: boolean;
  is_variation: boolean;
  sort_order: number;
  product_count: number;
  terms: Term[];
};

export type ReviewRow = {
  id: number;
  product: { id: number; name: string; slug: string } | null;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  status_label: string;
  is_verified_purchase: boolean;
  approved_at: string | null;
  created_at: string | null;
};

// --- CRM -------------------------------------------------------------------------

export type Customer = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  customer_type: string;
  customer_type_label: string;
  company: { id: number; name: string } | null;
  company_id: number | null;
  owner: Person;
  owner_id: number | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  lead_source: string | null;
  marketing_opt_in: boolean;
  preferred_contact_channel: string | null;
  notes: string | null;
  has_account: boolean;
  account?: {
    id: number;
    email: string;
    email_verified: boolean;
    last_login_at: string | null;
    created_at: string | null;
  } | null;
  quotes_count?: number;
  open_opportunities_count?: number;
  projects_count?: number;
  last_contacted_at: string | null;
  created_at: string | null;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  type: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  contacts_count?: number;
  opportunities_count?: number;
  created_at: string | null;
};

export type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  status_label: string;
  source: string;
  source_label: string;
  project_type: string | null;
  city: string | null;
  state: string | null;
  budget_range: string | null;
  message: string | null;
  attribution: Record<string, unknown> | null;
  assignee: Person;
  assigned_to: number | null;
  customer: { id: number; full_name: string } | null;
  opportunity_id?: number | null;
  contacted_at: string | null;
  converted_at: string | null;
  created_at: string | null;
};

export type Opportunity = {
  id: number;
  title: string;
  stage: string;
  stage_label: string;
  value: number;
  probability: number;
  weighted_value: number;
  source: string | null;
  source_label: string | null;
  customer: { id: number; full_name: string; phone: string | null } | null;
  customer_profile_id: number;
  company: { id: number; name: string } | null;
  owner: Person;
  owner_id: number | null;
  lead_id: number | null;
  expected_close_date: string | null;
  next_activity_at: string | null;
  lost_reason: string | null;
  closed_at: string | null;
  notes: string | null;
  sort_order: number;
  quotes_count?: number;
  created_at: string | null;
  updated_at: string | null;
};

export type BoardColumn = {
  stage: string;
  label: string;
  probability: number;
  count: number;
  value: number;
  weighted_value: number;
  cards: Opportunity[];
};

export type QuoteItem = {
  id: number;
  product_id: number | null;
  product_variant_id: number | null;
  product_name: string | null;
  product_slug: string | null;
  variant_sku: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  line_total: number;
  note: string | null;
};

export type Quote = {
  id: number;
  reference: string;
  status: string;
  status_label: string;
  source: string;
  source_label: string;
  customer: { id: number; full_name: string; email: string | null; phone: string | null } | null;
  customer_profile_id: number;
  owner: Person;
  owner_id: number | null;
  opportunity_id: number | null;
  project_type: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  preferred_installation_date: string | null;
  preferred_time_slot: string | null;
  requires_site_survey: boolean;
  requires_delivery: boolean;
  requires_installation: boolean;
  budget_range: string | null;
  notes: string | null;
  consent_given: boolean;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  valid_until: string | null;
  submitted_at: string | null;
  sent_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  items_count?: number;
  items?: QuoteItem[];
  attachments?: {
    id: number;
    original_name: string;
    mime_type: string | null;
    size_bytes: number | null;
  }[];
  calculation?: {
    id: number;
    total_area_sqm: number;
    area_with_waste_sqm: number;
    waste_percentage: number;
    packs_required: number | null;
    rooms: { name?: string; length?: number; width?: number; area?: number }[] | null;
  } | null;
};

export type Activity = {
  id: number;
  type: string;
  type_label: string;
  title: string;
  body: string | null;
  properties: Record<string, unknown> | null;
  subject_type: string;
  subject_id: number;
  user: Person;
  duration_minutes: number | null;
  occurred_at: string | null;
};

export type RecordLink = { type: string; id: number; label: string; path: string } | null;

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  status_label: string;
  priority: string;
  priority_label: string;
  due_at: string | null;
  is_overdue: boolean;
  completed_at: string | null;
  assignee: Person;
  assigned_to: number | null;
  creator: Person;
  subject: RecordLink;
  created_at: string | null;
};

// --- Operations ------------------------------------------------------------------

export type Appointment = {
  id: number;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  scheduled_at: string | null;
  ends_at: string | null;
  customer: { id: number; full_name: string; phone: string | null } | null;
  customer_profile_id: number;
  quote: { id: number; reference: string } | null;
  quote_id: number | null;
  project: { id: number; reference: string; name: string } | null;
  project_id: number | null;
  assignee: Person;
  assigned_to: number | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string | null;
};

export type Measurement = {
  id: number;
  site_survey_id: number | null;
  room_name: string;
  room_type: string | null;
  unit: string;
  length: number | null;
  width: number | null;
  area_sqm: number;
  deduction_sqm: number;
  net_area_sqm: number;
  notes: string | null;
  sort_order: number;
};

export type Survey = {
  id: number;
  status: string;
  status_label: string;
  scheduled_at: string | null;
  completed_at: string | null;
  customer: {
    id: number;
    full_name: string;
    phone: string | null;
    address_line: string | null;
    city: string | null;
    state: string | null;
  } | null;
  customer_profile_id: number;
  quote: { id: number; reference: string } | null;
  quote_id: number | null;
  project: { id: number; reference: string; name: string } | null;
  project_id: number | null;
  appointment_id: number | null;
  surveyor: Person;
  surveyor_id: number | null;
  subfloor_condition: string | null;
  preparation_notes: string | null;
  access_notes: string | null;
  findings: string | null;
  total_area_sqm: number;
  measurements?: Measurement[];
  photos?: MediaItem[];
  created_at: string | null;
};

export type Project = {
  id: number;
  reference: string;
  name: string;
  status: string;
  status_label: string;
  customer: { id: number; full_name: string; phone: string | null } | null;
  customer_profile_id: number;
  quote: { id: number; reference: string; total: number | null } | null;
  quote_id: number | null;
  owner: Person;
  owner_id: number | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  value: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  installations_count?: number;
  photos?: MediaItem[];
  created_at: string | null;
};

export type ChecklistItem = { label: string; done: boolean };

export type Installation = {
  id: number;
  status: string;
  status_label: string;
  project: {
    id: number;
    reference: string;
    name: string;
    address_line: string | null;
    city: string | null;
    state: string | null;
  } | null;
  project_id: number;
  customer: { id: number; full_name: string; phone: string | null } | null;
  quote_id: number | null;
  lead_installer: Person;
  lead_installer_id: number | null;
  crew: { id: number; name: string; role: string | null }[];
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  checklist: ChecklistItem[];
  notes: string | null;
  warranty_notes: string | null;
  sign_off_name: string | null;
  signed_off_at: string | null;
  photos?: MediaItem[];
  created_at: string | null;
};

// --- Reports & platform ------------------------------------------------------------

export type ReportColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "money" | "percent";
};

export type Report = {
  key: string;
  title: string;
  from: string;
  to: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
};

export type Setting = {
  key: string;
  label: string;
  group: string;
  input: string;
  help: string | null;
  value: unknown;
  /** For write-only secrets: whether one is stored. */
  is_set: boolean | null;
  is_public: boolean;
};

export type RoleSummary = {
  name: string;
  label: string;
  users_count: number;
  permissions: string[];
};

export type AuditEntry = {
  id: number;
  event: string;
  auditable_type: string | null;
  auditable_id: number | null;
  user: Person;
  changes: { field: string; old: unknown; new: unknown }[];
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

export type Dashboard = {
  sales?: {
    revenue_this_month: number;
    revenue_change: number | null;
    revenue_year: number;
    quoted_this_month: number;
    quotes_this_month: number;
    quotes_change: number | null;
    conversion_rate: number | null;
    conversion_sample: number;
    open_quotes: number;
    open_quote_value: number;
    average_won_value: number | null;
    by_month: { month: string; label: string; revenue: number; quoted: number; quotes: number }[];
  };
  geography?: { state: string; quotes: number; value: number; won: number }[];
  recent_quotes?: Quote[];
  pipeline?: {
    open_count: number;
    open_value: number;
    weighted_value: number;
    stages: { stage: string; label: string; count: number; value: number }[];
  };
  leads?: {
    new_this_month: number;
    new_change: number | null;
    open: number;
    uncontacted: number;
    average_response_hours: number | null;
    by_source: { source: string; label: string; count: number; converted: number }[];
  };
  catalogue?: {
    active_products: number;
    draft_products: number;
    unpriced_products: number;
    top_products: {
      id: number | null;
      name: string;
      slug: string | null;
      lines: number;
      value: number;
    }[];
    top_categories: { name: string; value: number; lines: number }[];
    stock_alerts: {
      variant_id: number;
      product_id: number;
      product: string | null;
      variant: string;
      sku: string;
      stock_status: string;
      stock_status_label: string;
      stock_quantity: number | null;
    }[];
  };
  engagement?: {
    visualizations_30d: number;
    calculations_30d: number;
    visualizer_quotes_30d: number;
    calculator_quotes_30d: number;
  };
  installations?: {
    by_status: { status: string; label: string; count: number }[];
    upcoming: Installation[];
  };
  appointments?: Appointment[];
  tasks?: { open: number; overdue: number; due_today: number; items: Task[] };
  activity?: Activity[];
};

// --- Storefront orders ---------------------------------------------------------

export type AdminOrderItem = {
  id: number;
  product_id: number | null;
  product_variant_id: number | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  product_slug: string | null;
  image_url: string | null;
  unit: string;
  unit_label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type AdminPayment = {
  id: number;
  gateway: string;
  gateway_label: string;
  reference: string;
  gateway_transaction_id: string | null;
  amount: number;
  status: "pending" | "successful" | "failed";
  channel: string | null;
  failure_reason: string | null;
  note: string | null;
  recorded_by: { id: number; name: string } | null;
  paid_at: string | null;
  created_at: string | null;
  can_recheck: boolean;
};

export type AdminOrder = {
  id: number;
  reference: string;
  status: string;
  status_label: string;
  payment_status: string;
  payment_status_label: string;
  payment_method: string;
  payment_method_label: string;
  fulfilment: "delivery" | "pickup";
  fulfilment_label: string;
  requires_installation: boolean;
  preferred_installation_date: string | null;
  full_name: string;
  email: string;
  phone: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  staff_notes: string | null;
  subtotal: number;
  installation_fee: number;
  delivery_fee: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  amount_paid?: number;
  currency: string;
  item_count?: number;
  customer?: { id: number; full_name: string } | null;
  owner?: { id: number; name: string } | null;
  has_account: boolean;
  items?: AdminOrderItem[];
  payments?: AdminPayment[];
  paid_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// --- Content (§18) ---------------------------------------------------------------

export type ContentSeoFields = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
};

type ContentRecord = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  status_label: string;
  is_live: boolean;
  published_at: string | null;
  cover_image: string | null;
  image_url: string | null;
  public_url: string;
  seo: ContentSeoFields;
  /** Images by collection; only on the editor. */
  media?: Record<string, MediaItem[]>;
  body?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminPage = ContentRecord & {
  eyebrow: string | null;
  excerpt: string | null;
  show_in_footer: boolean;
  sort_order: number;
  author: { id: number; name: string } | null;
  faqs?: { question: string; answer: string }[];
};

export type AdminPost = ContentRecord & {
  category: string;
  category_slug: string;
  excerpt: string | null;
  author_name: string | null;
  author: { id: number; name: string } | null;
  byline: string;
  reading_minutes: number;
  is_featured: boolean;
  tags: string[];
  floors: string[];
};

export type AdminPortfolio = ContentRecord & {
  project_id: number | null;
  project?: { id: number; label: string } | null;
  client_name: string | null;
  sector: string;
  location: string | null;
  city: string | null;
  state: string | null;
  area_sqm: number | null;
  completed_on: string | null;
  summary: string | null;
  is_featured: boolean;
  sort_order: number;
  floors: string[];
  photo_count: number;
};
