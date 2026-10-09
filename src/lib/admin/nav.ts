/**
 * The workspace navigation (§15 CRM modules). Each link names the permission
 * that makes it useful; the shell hides what a role cannot open.
 */

export type NavIcon =
  | "dashboard"
  | "pipeline"
  | "leads"
  | "quotes"
  | "customers"
  | "companies"
  | "tasks"
  | "appointments"
  | "surveys"
  | "projects"
  | "installations"
  | "products"
  | "categories"
  | "attributes"
  | "brands"
  | "taxonomies"
  | "reviews"
  | "textures"
  | "orders"
  | "pages"
  | "posts"
  | "portfolio"
  | "reports"
  | "staff"
  | "settings"
  | "audit";

export type NavItem = { href: string; label: string; icon: NavIcon; permissions: string[] };
export type NavGroup = { label: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", permissions: [] }],
  },
  {
    label: "Sales",
    items: [
      {
        href: "/admin/pipeline",
        label: "Pipeline",
        icon: "pipeline",
        permissions: ["opportunities.view"],
      },
      { href: "/admin/leads", label: "Leads", icon: "leads", permissions: ["leads.view"] },
      { href: "/admin/quotes", label: "Quotes", icon: "quotes", permissions: ["quotes.view"] },
      {
        href: "/admin/customers",
        label: "Customers",
        icon: "customers",
        permissions: ["customers.view"],
      },
      {
        href: "/admin/companies",
        label: "Companies",
        icon: "companies",
        permissions: ["companies.view"],
      },
      { href: "/admin/tasks", label: "Tasks", icon: "tasks", permissions: ["tasks.view"] },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders", permissions: ["orders.view"] },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/admin/appointments",
        label: "Appointments",
        icon: "appointments",
        permissions: ["appointments.view"],
      },
      {
        href: "/admin/surveys",
        label: "Site surveys",
        icon: "surveys",
        permissions: ["surveys.view"],
      },
      {
        href: "/admin/projects",
        label: "Projects",
        icon: "projects",
        permissions: ["projects.view"],
      },
      {
        href: "/admin/installations",
        label: "Installations",
        icon: "installations",
        permissions: ["installations.view"],
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: "products",
        permissions: ["products.view"],
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: "categories",
        permissions: ["categories.view"],
      },
      {
        href: "/admin/attributes",
        label: "Attributes & swatches",
        icon: "attributes",
        permissions: ["attributes.view"],
      },
      {
        href: "/admin/brands",
        label: "Brands & collections",
        icon: "brands",
        permissions: ["brands.view", "collections.view"],
      },
      {
        href: "/admin/taxonomies",
        label: "Rooms & styles",
        icon: "taxonomies",
        permissions: ["taxonomies.view"],
      },
      { href: "/admin/reviews", label: "Reviews", icon: "reviews", permissions: ["reviews.view"] },
      {
        href: "/admin/visualizer-textures",
        label: "Visualizer textures",
        icon: "textures",
        permissions: ["media.update"],
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: "pages", permissions: ["content.view"] },
      { href: "/admin/posts", label: "Journal", icon: "posts", permissions: ["content.view"] },
      {
        href: "/admin/portfolio",
        label: "Portfolio",
        icon: "portfolio",
        permissions: ["content.view"],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports", permissions: ["reports.view"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/staff", label: "Staff & roles", icon: "staff", permissions: ["users.view"] },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: "settings",
        permissions: ["settings.view"],
      },
      {
        href: "/admin/audit-log",
        label: "Audit log",
        icon: "audit",
        permissions: ["audit-logs.view"],
      },
    ],
  },
];

export function navFor(permissions: string[]): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.permissions.length === 0 ||
        item.permissions.some((permission) => permissions.includes(permission)),
    ),
  })).filter((group) => group.items.length > 0);
}
