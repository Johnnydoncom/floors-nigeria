import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import oakImg from "@/assets/collection-oak.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import hotelImg from "@/assets/project-hotel.jpg";
import officeImg from "@/assets/project-office.jpg";
import residenceImg from "@/assets/project-residence.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/collections")({
  component: Collections,
  head: () => ({
    meta: [
      { title: "Collections — Floors NG" },
      { name: "description", content: "Curated flooring collections for residential, hospitality and commercial specifications." },
      { property: "og:title", content: "Collections — Floors NG" },
    ],
  }),
});

const items = [
  { name: "The Heritage Oak Collection", count: 24, img: oakImg, desc: "European white oak in six brushed finishes." },
  { name: "Metropolis Contract SPC", count: 18, img: spcImg, desc: "Waterproof stone-polymer for high-traffic interiors." },
  { name: "Savoy Natural Stone", count: 12, img: stoneImg, desc: "Book-matched marble, limestone and travertine." },
  { name: "The Hospitality Series", count: 32, img: hotelImg, desc: "Herringbone, chevron and wide-plank formats." },
  { name: "Corporate Contract", count: 21, img: officeImg, desc: "LVT and carpet-tile specified for towers." },
  { name: "Residence by Floors NG", count: 40, img: residenceImg, desc: "Bespoke residential mood boards." },
];

function Collections() {
  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Collections</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-3xl text-balance">
            Curated by architects, chosen by connoisseurs.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid py-16 grid md:grid-cols-2 gap-6">
        {items.map((c, i) => (
          <Reveal key={c.name} delay={(i % 2) * 0.08}>
            <Link to="/products" className="group block relative aspect-[4/3] overflow-hidden rounded-3xl">
              <img src={c.img} alt={c.name} className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="font-mono text-[11px] uppercase tracking-widest opacity-80">{c.count} pieces</div>
                <div className="mt-1 font-display text-3xl md:text-4xl">{c.name}</div>
                <div className="mt-2 text-sm opacity-85 max-w-md">{c.desc}</div>
              </div>
              <div className="absolute top-6 right-6 h-11 w-11 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}
