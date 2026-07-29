import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/hero-living.jpg";
import hotelImg from "@/assets/project-hotel.jpg";
import officeImg from "@/assets/project-office.jpg";
import residenceImg from "@/assets/project-residence.jpg";
import spcImg from "@/assets/collection-spc.jpg";
import stoneImg from "@/assets/collection-stone.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/industries")({
  component: Industries,
  head: () => ({
    meta: [
      { title: "Industries — Floors NG" },
      { name: "description", content: "Flooring solutions engineered for residential, hospitality, commercial, healthcare, education and retail." },
      { property: "og:title", content: "Industries — Floors NG" },
    ],
  }),
});

const industries = [
  { name: "Residential", desc: "Wide-plank oak, herringbone parquet and stone for homes.", img: heroImg },
  { name: "Commercial", desc: "LVT, SPC and carpet-tile for Grade-A office towers.", img: officeImg },
  { name: "Hospitality", desc: "Statement floors for hotels, restaurants and lounges.", img: hotelImg },
  { name: "Healthcare", desc: "Hygienic, sound-absorbing surfaces for clinical spaces.", img: spcImg },
  { name: "Education", desc: "Impact-rated flooring for schools and universities.", img: residenceImg },
  { name: "Retail", desc: "Luxury display floors that outlast the traffic.", img: stoneImg },
];

function Industries() {
  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Solutions</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-4xl text-balance">
            One house. Every sector.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {industries.map((i, idx) => (
          <Reveal key={i.name} delay={(idx % 3) * 0.06}>
            <Link to="/products" className="group block">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-muted">
                <img src={i.img} alt={i.name} className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 className="font-display text-3xl">{i.name}</h3>
                  <p className="mt-1 text-sm opacity-85">{i.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm">Explore <ArrowUpRight className="h-4 w-4" /></div>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}
