/**
 * Reference projects shown on the homepage, the portfolio and each project's
 * own page.
 *
 * Held here until the CMS pass adds project galleries (see the delivery plan);
 * every page reads from this one list so a project is edited once.
 *
 * PLACEHOLDER CONTENT: the names, locations and areas below are the
 * portfolio entries the site launched with. Confirm each with the team — and
 * that the client agrees to be named — before go-live. Pages state only these
 * facts; add photography and the real scope when the case studies exist.
 */

export type Project = {
  slug: string;
  name: string;
  location: string;
  city: string;
  sector: "Hospitality" | "Commercial" | "Residential";
  area: string;
  image: string;
  /**
   * Floors to suggest for a similar space, by category slug. Presented as
   * suggestions, not as the specification used — that belongs in the real
   * case study.
   */
  floors: string[];
};

export const PROJECTS: Project[] = [
  {
    slug: "radisson-blu-lagos",
    name: "Radisson Blu Lagos",
    location: "Victoria Island",
    city: "Lagos",
    sector: "Hospitality",
    area: "4,200 m²",
    image: "/images/project-hotel.jpg",
    floors: ["wall-to-wall-carpets", "woolen-carpet-tiles-in-nigeria", "laminate-flooring"],
  },
  {
    slug: "access-tower-ikoyi",
    name: "Access Tower Ikoyi",
    location: "Ikoyi",
    city: "Lagos",
    sector: "Commercial",
    area: "12,800 m²",
    image: "/images/project-office.jpg",
    floors: ["needle-felt-carpet-tiles", "rigid-vinyl-floor-spc-flooring", "vinyl-flooring"],
  },
  {
    slug: "banana-island-residence",
    name: "Banana Island Residence",
    location: "Banana Island",
    city: "Lagos",
    sector: "Residential",
    area: "620 m²",
    image: "/images/project-residence.jpg",
    floors: ["real-wood-flooring", "laminate-flooring", "rigid-vinyl-floor-spc-flooring"],
  },
  {
    slug: "eko-signature-villa",
    name: "Eko Signature Villa",
    location: "Eko Atlantic",
    city: "Lagos",
    sector: "Residential",
    area: "1,150 m²",
    image: "/images/hero-living.jpg",
    floors: ["rigid-vinyl-floor-spc-flooring", "wpc-flooring", "artificial-grass"],
  },
  {
    slug: "transcorp-hilton-refresh",
    name: "Transcorp Hilton Refresh",
    location: "Maitama",
    city: "Abuja",
    sector: "Hospitality",
    area: "6,400 m²",
    image: "/images/collection-stone.jpg",
    floors: ["wall-to-wall-carpets", "laminate-flooring", "floor-mats-nigeria"],
  },
  {
    slug: "sterling-hq",
    name: "Sterling HQ",
    location: "Marina",
    city: "Lagos",
    sector: "Commercial",
    area: "9,200 m²",
    image: "/images/collection-spc.jpg",
    floors: ["rigid-vinyl-floor-spc-flooring", "needle-felt-carpet-tiles", "floor-mats-nigeria"],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}

/** The one-sentence summary every project page and card is built from. */
export function projectSummary(project: Project): string {
  return `${project.area} of ${project.sector.toLowerCase()} flooring in ${project.location}, ${project.city} — specified, supplied and installed by Floor Nigeria.`;
}
