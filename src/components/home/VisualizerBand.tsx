import Link from "next/link";
import { ArrowRight, Calculator, Camera, Palette, Package } from "lucide-react";
import { RoomSwapDemo } from "./RoomSwapDemo";
import { getProducts } from "@/lib/api/catalog";
import { floorChoices } from "@/lib/room/materials";
import type { TextureChoice } from "@/lib/visualizer/types";

const POINTS = [
  { icon: Camera, text: "Start from a photo of your own room, or one of ours" },
  { icon: Palette, text: "Change the wall colour, the lighting and the plank direction" },
  { icon: Package, text: "Save the design, then order a sample or a quote from it" },
];

/** The visualizer, shown working: real floors laid in a real room. */
export async function VisualizerBand() {
  const floors = await demoFloors();

  return (
    <section
      aria-labelledby="home-visualizer"
      className="bg-charcoal-dark py-16 text-primary-foreground md:py-24"
    >
      <div className="container-fluid grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2
            id="home-visualizer"
            className="text-balance font-display text-[1.9rem] leading-[1.1] tracking-[-0.02em] md:text-[2.6rem]"
          >
            Try a floor in the room before it&apos;s laid
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-primary-foreground/70 md:text-lg">
            Our room visualizer lays any floor in the catalogue at its real plank size, with the
            room&apos;s own light and shadow.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point.text} className="flex gap-3">
                <point.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-light" aria-hidden />
                <span className="text-primary-foreground/85">{point.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/visualizer" className="btn btn-gold">
              Open the visualizer <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 font-display text-sm font-semibold text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              <Calculator className="h-4 w-4" aria-hidden />
              Work out how much you need
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7">
          <RoomSwapDemo floors={floors} />
        </div>
      </div>
    </section>
  );
}

/** Four popular floors, one colour each, so the swatches are four different floors. */
async function demoFloors(): Promise<TextureChoice[]> {
  const { data } = await getProducts({ sort: "popular", per_page: 12 });
  const seen = new Set<string>();
  const floors: TextureChoice[] = [];
  for (const choice of floorChoices(data)) {
    if (seen.has(choice.productSlug)) continue;
    seen.add(choice.productSlug);
    floors.push(choice);
    if (floors.length === 4) break;
  }
  return floors;
}
