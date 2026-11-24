import { preload } from "react-dom";
import { HeroSlider, type HeroSlideView } from "./HeroSlider";
import { HERO_SLIDES, heroFallbackSrc, heroSrcSet, type HeroSlide } from "@/lib/home/hero-slides";
import { getPortfolio } from "@/lib/api/content";
import { area } from "@/lib/format";
import { fromPrice } from "@/lib/home/prices";

/** The page's one h1: what we do and where, above every slide's own headline. */
export const HOME_HEADING = "Flooring supplied and installed across Nigeria";

/** The hero with its live figures: "from" prices and the reference projects. */
export async function HomeHero() {
  preloadFirstSlide();
  const [prices, projects] = await Promise.all([
    Promise.all(HERO_SLIDES.map((slide) => (slide.priceFrom ? fromPrice(slide.priceFrom) : null))),
    getPortfolio({ limit: 12 }),
  ]);

  const slides = HERO_SLIDES.map<HeroSlideView>((slide, position) =>
    slide.id === "projects" ? withProjects(slide, projects) : { ...slide, note: prices[position] },
  );

  return <HeroSlider slides={slides} heading={HOME_HEADING} />;
}

/** The hero without live figures, while they load. */
export function HomeHeroFallback() {
  preloadFirstSlide();
  return <HeroSlider slides={HERO_SLIDES} heading={HOME_HEADING} />;
}

type Project = Awaited<ReturnType<typeof getPortfolio>>[number];

/** Name real reference projects, and what they add up to, when there are some. */
function withProjects(slide: HeroSlide, projects: Project[]): HeroSlideView {
  const commercial = projects.filter((project) => project.sector !== "Residential");
  const named = (commercial.length ? commercial : projects)
    .slice(0, 3)
    .map((project) => project.title);
  const total = projects.reduce((sum, project) => sum + (project.area_sqm ?? 0), 0);

  return {
    ...slide,
    copy: named.length
      ? `Recent work includes ${list(named)}: specified, supplied and installed by our own crews.`
      : slide.copy,
    note:
      total > 0 ? `${area(Math.round(total))} across ${projects.length} reference projects` : null,
  };
}

function list(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** The first slide's photograph is the page's largest paint: fetch it from the head. */
function preloadFirstSlide() {
  const { image } = HERO_SLIDES[0];
  preload(heroFallbackSrc(image), {
    as: "image",
    imageSrcSet: heroSrcSet(image),
    imageSizes: "100vw",
    fetchPriority: "high",
  });
}
